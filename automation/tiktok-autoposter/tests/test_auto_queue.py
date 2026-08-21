from datetime import datetime, timezone
from pathlib import Path

import auto_queue
from auto_queue import next_available_slot, parse_slots, product_from_filename, scan_inbox
from auto_runner import published_archive_target


def test_parse_default_slots():
    assert parse_slots("13:00,21:00") == [(13, 0), (21, 0)]


def test_next_slot_uses_sao_paulo_timezone():
    now = datetime(2026, 8, 21, 15, 0, tzinfo=timezone.utc)  # 12:00 in Sao Paulo
    slot = next_available_slot(
        now,
        occupied_utc=set(),
        slots=[(13, 0), (21, 0)],
        timezone_name="America/Sao_Paulo",
    )
    assert slot == "2026-08-21T16:00:00+00:00"


def test_next_slot_skips_occupied_slot():
    now = datetime(2026, 8, 21, 15, 0, tzinfo=timezone.utc)
    occupied = {"2026-08-21T16:00:00+00:00"}
    slot = next_available_slot(
        now,
        occupied_utc=occupied,
        slots=[(13, 0), (21, 0)],
        timezone_name="America/Sao_Paulo",
    )
    assert slot == "2026-08-22T00:00:00+00:00"


def test_product_name_comes_from_filename():
    assert product_from_filename(Path("satin-midi-dress_black.mp4")) == "Satin Midi Dress Black"


def test_scan_keeps_video_in_inbox_until_publication(tmp_path, monkeypatch):
    folders = auto_queue.ensure_folders(tmp_path)
    video = folders["inbox"] / "satin-midi-dress.mp4"
    video.write_bytes(b"video")

    monkeypatch.setattr(auto_queue, "list_items", lambda: [])
    monkeypatch.setattr(auto_queue, "add_item", lambda *args, **kwargs: 99)
    monkeypatch.setattr(
        auto_queue,
        "next_available_slot",
        lambda *args, **kwargs: "2026-08-21T21:00:00+00:00",
    )

    ids = scan_inbox(tmp_path)

    assert ids == [99]
    assert video.exists()
    assert not (folders["queued"] / video.name).exists()


def test_published_archive_has_date_and_time(tmp_path):
    target = published_archive_target(
        tmp_path / "published",
        "satin-midi-dress.mp4",
        "2026-08-21T19:24:33+00:00",  # 16:24:33 in Sao Paulo
    )

    assert target.parent.name == "2026-08-21"
    assert target.name == "2026-08-21_16-24-33__satin-midi-dress.mp4"
