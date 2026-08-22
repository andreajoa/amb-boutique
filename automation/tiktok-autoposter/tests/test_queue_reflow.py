from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import auto_runner


def test_reflow_slots_compacts_future_queue_after_renames(tmp_path, monkeypatch):
    inbox = tmp_path / "inbox"
    queued = tmp_path / "queued"
    published = tmp_path / "published"
    failed = tmp_path / "failed"
    for folder in (inbox, queued, published, failed):
        folder.mkdir()

    old_12 = inbox / "old-12.mp4"
    old_15 = inbox / "old-15.mp4"
    real_1 = inbox / "01.mp4"
    real_2 = inbox / "02.mp4"
    real_3 = inbox / "03.mp4"
    for path in (real_1, real_2, real_3):
        path.write_bytes(b"video")

    items = [
        SimpleNamespace(id=7, status="queued", scheduled_for="2026-08-22T15:00:00+00:00", error=None, video_path=str(old_12)),
        SimpleNamespace(id=8, status="queued", scheduled_for="2026-08-22T18:00:00+00:00", error=None, video_path=str(old_15)),
        SimpleNamespace(id=10, status="queued", scheduled_for="2026-08-23T00:00:00+00:00", error=None, video_path=str(real_1)),
        SimpleNamespace(id=11, status="queued", scheduled_for="2026-08-23T02:00:00+00:00", error=None, video_path=str(real_2)),
        SimpleNamespace(id=12, status="queued", scheduled_for="2026-08-23T12:00:00+00:00", error=None, video_path=str(real_3)),
    ]

    monkeypatch.setattr(auto_runner, "list_items", lambda: items)
    monkeypatch.setattr(
        auto_runner,
        "ensure_folders",
        lambda: {"inbox": inbox, "queued": queued, "published": published, "failed": failed},
    )

    updates = []
    retired = []
    monkeypatch.setattr(auto_runner, "set_item_schedule", lambda item_id, schedule: updates.append((item_id, schedule)))
    monkeypatch.setattr(auto_runner, "retire_missing_item", lambda missing, replacement_id: retired.append((missing.id, replacement_id)))

    auto_runner.reflow_queue_after_renames(
        now=datetime(2026, 8, 22, 14, 30, tzinfo=timezone.utc)
    )

    assert updates == [
        (10, "2026-08-22T15:00:00+00:00"),
        (11, "2026-08-22T18:00:00+00:00"),
        (12, "2026-08-22T21:00:00+00:00"),
    ]
    assert retired == [(7, 10), (8, 11)]
