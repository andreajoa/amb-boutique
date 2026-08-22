import sqlite3
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

import auto_runner


def fake_connect_factory(db_path: Path):
    def fake_connect():
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS queue (
                id INTEGER PRIMARY KEY,
                status TEXT,
                scheduled_for TEXT,
                error TEXT,
                video_path TEXT,
                published_at TEXT
            )
            """
        )
        conn.commit()
        return conn

    return fake_connect


def test_retry_schedules_next_attempt_and_keeps_item_queued(tmp_path, monkeypatch):
    db_path = tmp_path / "retry.db"
    monkeypatch.setattr(auto_runner, "connect", fake_connect_factory(db_path))
    monkeypatch.setenv("AMB_TIKTOK_RETRY_DELAY_SECONDS", "15")
    monkeypatch.setenv("AMB_TIKTOK_MAX_ATTEMPTS", "3")

    with auto_runner.connect() as conn:
        conn.execute(
            "INSERT INTO queue(id, status, scheduled_for, error, video_path) VALUES (1, 'failed', NULL, NULL, 'video.mp4')"
        )
        conn.commit()

    attempts = auto_runner.record_attempt_start(1)
    assert attempts == 1
    assert auto_runner.schedule_retry(1, "temporary TikTok error", attempts=attempts) is True

    with auto_runner.connect() as conn:
        row = conn.execute("SELECT status, scheduled_for, error FROM queue WHERE id=1").fetchone()

    assert row["status"] == "queued"
    assert row["scheduled_for"]
    assert "[retry 1/3" in row["error"]
    assert "temporary TikTok error" in row["error"]


def test_final_attempt_is_marked_failed(tmp_path, monkeypatch):
    db_path = tmp_path / "retry.db"
    monkeypatch.setattr(auto_runner, "connect", fake_connect_factory(db_path))
    monkeypatch.setenv("AMB_TIKTOK_MAX_ATTEMPTS", "2")

    auto_runner.record_attempt_start(7)
    auto_runner.record_attempt_start(7)
    marked = {}

    def fake_mark(item_id, status, error=None):
        marked.update(item_id=item_id, status=status, error=error)

    monkeypatch.setattr(auto_runner, "mark", fake_mark)

    assert auto_runner.schedule_retry(7, "still failing", attempts=2) is False
    assert marked["item_id"] == 7
    assert marked["status"] == "failed"
    assert "[final attempt 2/2]" in marked["error"]


def test_upload_timeout_returns_recoverable_error(monkeypatch):
    monkeypatch.setenv("AMB_TIKTOK_UPLOAD_TIMEOUT_SECONDS", "30")

    def fake_run(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd=args[0], timeout=kwargs["timeout"])

    monkeypatch.setattr(auto_runner.subprocess, "run", fake_run)
    returncode, message = auto_runner.run_post_with_timeout(11)

    assert returncode == 124
    assert "timed out after 30s" in message
    assert "scheduler can retry" in message


def test_reconcile_recovers_interrupted_publishing_item(tmp_path, monkeypatch):
    inbox = tmp_path / "inbox"
    queued = tmp_path / "queued"
    published = tmp_path / "published"
    failed = tmp_path / "failed"
    for folder in (inbox, queued, published, failed):
        folder.mkdir()

    video = inbox / "look.mp4"
    video.write_bytes(b"video")
    item = SimpleNamespace(
        id=22,
        status="publishing",
        video_path=str(video),
        published_at=None,
        error=None,
    )
    monkeypatch.setattr(
        auto_runner,
        "ensure_folders",
        lambda: {"inbox": inbox, "queued": queued, "published": published, "failed": failed},
    )
    monkeypatch.setattr(auto_runner, "list_items", lambda: [item])
    monkeypatch.setattr(auto_runner, "ensure_attempt_record", lambda item_id: 1)

    captured = {}

    def fake_schedule_retry(item_id, error, attempts=None):
        captured.update(item_id=item_id, error=error, attempts=attempts)
        return True

    monkeypatch.setattr(auto_runner, "schedule_retry", fake_schedule_retry)

    auto_runner.reconcile_finished_items()

    assert captured["item_id"] == 22
    assert captured["attempts"] == 1
    assert "interrupted TikTok publishing attempt" in captured["error"]


def test_missing_renamed_video_backfills_overdue_slot(tmp_path, monkeypatch):
    db_path = tmp_path / "retry.db"
    monkeypatch.setattr(auto_runner, "connect", fake_connect_factory(db_path))

    inbox = tmp_path / "inbox"
    queued = tmp_path / "queued"
    published = tmp_path / "published"
    failed = tmp_path / "failed"
    for folder in (inbox, queued, published, failed):
        folder.mkdir()

    missing_path = inbox / "old-name.mp4"
    renamed_path = inbox / "01.mp4"
    renamed_path.write_bytes(b"same real video under a new name")
    overdue = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    future = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()

    with auto_runner.connect() as conn:
        conn.execute(
            "INSERT INTO queue(id, status, scheduled_for, error, video_path) VALUES (6, 'failed', ?, 'old retry error', ?)",
            (overdue, str(missing_path)),
        )
        conn.execute(
            "INSERT INTO queue(id, status, scheduled_for, error, video_path) VALUES (9, 'queued', ?, NULL, ?)",
            (future, str(renamed_path)),
        )
        conn.commit()

    items = [
        SimpleNamespace(id=6, status="failed", scheduled_for=overdue, error="old retry error", video_path=str(missing_path)),
        SimpleNamespace(id=9, status="queued", scheduled_for=future, error=None, video_path=str(renamed_path)),
    ]
    monkeypatch.setattr(auto_runner, "list_items", lambda: items)
    monkeypatch.setattr(
        auto_runner,
        "ensure_folders",
        lambda: {"inbox": inbox, "queued": queued, "published": published, "failed": failed},
    )

    auto_runner.backfill_missing_due_items()

    with auto_runner.connect() as conn:
        old = conn.execute("SELECT status, error FROM queue WHERE id=6").fetchone()
        replacement = conn.execute("SELECT scheduled_for, error FROM queue WHERE id=9").fetchone()

    assert old["status"] == "failed"
    assert "[backfilled by item #9]" in old["error"]
    assert replacement["scheduled_for"] == overdue
    assert replacement["error"] is None
