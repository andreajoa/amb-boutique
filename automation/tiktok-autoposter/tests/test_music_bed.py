from pathlib import Path

from music_bed import generate_music_bed, style_key
from music_selector import choose_music_profile


def test_style_mapping_uses_fashion_context():
    summer = choose_music_profile("Floral Linen Summer Dress")
    street = choose_music_profile("Oversized Denim Cargo Jacket")
    romantic = choose_music_profile("Romantic Lace Date Dress")

    assert style_key(summer) == "summer"
    assert style_key(street) == "street"
    assert style_key(romantic) == "romantic"


def test_music_bed_is_generated_as_stereo_wav(tmp_path):
    profile = choose_music_profile("Black Satin Evening Dress")
    bed = generate_music_bed(profile, cache_dir=tmp_path)

    assert bed.path.exists()
    assert bed.path.suffix == ".wav"
    assert bed.path.stat().st_size > 10000
    assert bed.title.startswith("AMB Original")
    assert bed.bpm > 0
