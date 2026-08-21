from datetime import datetime, timezone
from pathlib import Path

import auto_queue
from auto_queue import dropbox_root, next_available_slot, parse_slots, product_from_filename, scan_inbox
from auto_runner import published_archive_target


def test_parse_default_slots():
    assert parse_slots("09:00,12:00,15:00,18:00,21:00,23:00") == [
        (9, 0), (12, 0), (15, 0), (18, 0), (21, 0), (23, 0)
    ]


def test_default_dropbox_is_in_downloads(tmp_path, monkeypatch):
    monkeypatch.delenv("AMB_TIKTOK_DROPBOX", raising=False)
    monkeypatch.setenv("HOME", str(tmp_path))
    assert dropbox_root() == (tmp_path / "Downloads" / "AMB-TikTok").resolve()


def test_next_slot_uses_sao_paulo_timezone():
    now = datetime(2026, 8, 21, 15, 0, tzinfo=timezone.utc)  # 12:00 in Sao Paulo
    slot = next_available_slot(
        now,
        occupied_utc=set(),
        slots=[(15, 0), (18, 0)],
        timezone_name="America/Sao_Paulo",
    )
    assert slot == "2026-08-21T18:00:00+00:00"


def test_next_slot_skips_occupied_slot():
    now = datetime(2026, 8, 21, 15, 0, tzinfo=timezone.utc)
    occupied = {"2026-08-21T18:00:00+00:00"}
    slot = next_available_slot(
        now,
        occupied_utc=occupied,
        slots=[(15, 0), (18, 0)],
        timezone_name="America/Sao_Paulo",
    )
    assert slot == "2026-08-21T21:00:00+00:00"


def test_recently_missed_slot_is_kept_inside_grace_window():
    now = datetime(2026, 8, 21, 21, 27, tzinfo=timezone.utc)  # 18:27 in Sao Paulo
    slot = next_available_slot(
        now,
        occupied_utc=set(),
        slots=[(18, 0), (21, 0)],
        timezone_name="America/Sao_Paulo",
        grace_minutes=45,
    )
    assert slot == "2026-08-21T21:00:00+00:00"


def test_recent_slot_does_not_duplicate_when_already_occupied():
    now = datetime(2026, 8, 21, 21, 27, tzinfo=timezone.utc)
    occupied = {"2026-08-21T21:00:00+00:00"}
    slot = next_available_slot(
        now,
        occupied_utc=occupied,
        slots=[(18, 0), (21, 0)],
        timezone_name="America/Sao_Paulo",
        grace_minutes=45,
    )
    assert slot == "2026-08-22T00:00:00+00:00"


def test_product_name_comes_from_filename():
    assert product_from_filename(Path("satin-midi-dress_black.mp4")) == "Satin Midi Dress Black"


def test_scan_keeps_video_in_inbox_until_publication_and_requires_music(tmp_path, monkeypatch):
    folders = auto_queue.ensure_folders(tmp_path)
    video = folders["inbox"] / "satin-midi-dress.mp4"
    video.write_bytes(b"video")
    captured = {}

    monkeypatch.setattr(auto_queue, "list_items", lambda: [])

    def fake_add_item(*args, **kwargs):
        captured["args"] = args
        captured["kwargs"] = kwargs
        return 99

    monkeypatch.setattr(auto_queue, "add_item", fake_add_item)
    monkeypatch.setattr(
        auto_queue,
        "next_available_slot",
        lambda *args, **kwargs: "2026-08-21T18:00:00+00:00",
    )

    ids = scan_inbox(tmp_path)

    assert ids == [99]
    assert video.exists()
    assert not (folders["queued"] / video.name).exists()
    assert captured["kwargs"]["music_required"] is True
    assert captured["kwargs"]["music_query"] is None


def test_sidecar_can_override_music_search(tmp_path, monkeypatch):
    folders = auto_queue.ensure_folders(tmp_path)
    video = folders["inbox"] / "black-blazer.mp4"
    video.write_bytes(b"video")
    video.with_suffix(".json").write_text(
        '{"music_query":"runway electronic","music_required":true}',
        encoding="utf-8",
    )
    captured = {}

    monkeypatch.setattr(auto_queue, "list_items", lambda: [])
    monkeypatch.setattr(auto_queue, "next_available_slot", lambda *a, **k: "2026-08-21T18:00:00+00:00")

    def fake_add_item(*args, **kwargs):
        captured.update(kwargs)
        return 100

    monkeypatch.setattr(auto_queue, "add_item", fake_add_item)
    assert scan_inbox(tmp_path) == [100]
    assert captured["music_query"] == "runway electronic"
    assert captured["music_required"] is True


def test_published_archive_has_date_and_time(tmp_path):
    target = published_archive_target(
        tmp_path / "published",
        "satin-midi-dress.mp4",
        "2026-08-21T19:24:33+00:00",  # 16:24:33 in Sao Paulo
    )

    assert target.parent.name == "2026-08-21"
    assert target.name == "2026-08-21_16-24-33__satin-midi-dress.mp4"
