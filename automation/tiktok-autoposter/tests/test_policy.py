import importlib.util
import sys
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "autoposter.py"
spec = importlib.util.spec_from_file_location("autoposter", MODULE)
autoposter = importlib.util.module_from_spec(spec)
sys.modules["autoposter"] = autoposter
assert spec.loader
spec.loader.exec_module(autoposter)


def test_default_caption_is_english_only():
    text = autoposter.default_caption(
        "Elegant Satin Midi Dress",
        "US",
        "https://example.com/item",
    )
    autoposter.assert_english_only(text)
    assert "#WomensFashion" in text


def test_portuguese_caption_is_rejected():
    try:
        autoposter.assert_english_only("Compre agora e ganhe frete grátis")
    except ValueError:
        return
    raise AssertionError("Portuguese caption should have been rejected")


def test_supported_markets():
    assert set(autoposter.MARKETS) == {"US", "CA", "UK", "AU", "NZ"}


def test_publish_time_is_normalized_to_utc():
    value = autoposter.normalize_publish_at("2026-08-22T19:00:00-04:00")
    assert value == "2026-08-22T23:00:00+00:00"


def test_publish_time_requires_timezone():
    try:
        autoposter.normalize_publish_at("2026-08-22T19:00:00")
    except ValueError:
        return
    raise AssertionError("Timezone-less publish time should have been rejected")
