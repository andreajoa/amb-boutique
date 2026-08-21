from datetime import datetime, timezone
from pathlib import Path

from auto_queue import next_available_slot, parse_slots, product_from_filename


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
