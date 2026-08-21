from pathlib import Path

from autoposter import extract_selected_music
from music_selector import choose_music_profile, commercial_music_query
from tiktok_studio_music import commercial_context_visible


def test_satin_evening_uses_chic_profile():
    profile = choose_music_profile(
        "Satin Evening Dress",
        "A polished look for dinner and special occasions.",
        Path("satin-evening-dress.mp4"),
    )
    assert profile.query == "chic upbeat fashion"
    assert profile.theme == "Fashion"


def test_linen_summer_uses_bright_profile():
    assert commercial_music_query(
        "Linen Summer Set",
        video_path="linen-summer-set.mp4",
    ) == "bright summer fashion"


def test_custom_music_query_wins():
    profile = choose_music_profile(
        "Black Midi Dress",
        override_query="elegant runway pop",
    )
    assert profile.query == "elegant runway pop"
    assert profile.mood == "Custom"


def test_default_profile_is_fashion_safe():
    profile = choose_music_profile("Minimal Black Top")
    assert "fashion" in profile.query


def test_selected_music_is_extracted_from_publisher_output():
    output = "Browser log\nMUSIC_SELECTED: Night Drive - Example Artist\nPublished successfully\n"
    assert extract_selected_music(output) == "Night Drive - Example Artist"


def test_commercial_context_requires_music_specific_phrase():
    assert commercial_context_visible("Browse Commercial Sounds for your post") is True
    assert commercial_context_visible("Commercial Music Library") is True
    assert commercial_context_visible("Disclose commercial content") is False
    assert commercial_context_visible("Trending sounds") is False
