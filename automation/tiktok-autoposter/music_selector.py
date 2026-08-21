#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class MusicProfile:
    query: str
    mood: str
    genre: str
    theme: str


PROFILES: tuple[tuple[set[str], MusicProfile], ...] = (
    (
        {"party", "evening", "night", "sequin", "sparkle", "glam", "satin", "cocktail"},
        MusicProfile("chic upbeat fashion", "Confident", "Pop", "Fashion"),
    ),
    (
        {"summer", "beach", "resort", "linen", "floral", "vacation", "vacay", "sun"},
        MusicProfile("bright summer fashion", "Happy", "Pop", "Lifestyle"),
    ),
    (
        {"knit", "knitted", "cardigan", "cozy", "autumn", "fall", "winter", "soft"},
        MusicProfile("soft cozy fashion", "Chill", "R&B", "Lifestyle"),
    ),
    (
        {"blazer", "tailored", "office", "workwear", "business", "trouser", "trousers", "suit"},
        MusicProfile("confident modern fashion", "Confident", "Electronic", "Fashion"),
    ),
    (
        {"sport", "active", "activewear", "gym", "fitness", "running", "workout"},
        MusicProfile("energetic fashion workout", "Dynamic", "Electronic", "Sports"),
    ),
    (
        {"romantic", "lace", "date", "wedding", "bridal", "feminine", "delicate"},
        MusicProfile("romantic elegant fashion", "Romantic", "Pop", "Fashion"),
    ),
    (
        {"street", "streetwear", "denim", "jeans", "cargo", "oversized", "urban"},
        MusicProfile("cool street fashion", "Cool", "Hip Hop", "Fashion"),
    ),
)

DEFAULT_PROFILE = MusicProfile("stylish upbeat fashion", "Confident", "Pop", "Fashion")


def _tokens(text: str) -> set[str]:
    normalized = "".join(ch.lower() if ch.isalnum() else " " for ch in text)
    return {token for token in normalized.split() if token}


def choose_music_profile(
    product_name: str,
    caption: str = "",
    video_path: str | Path | None = None,
    override_query: str | None = None,
) -> MusicProfile:
    if override_query and override_query.strip():
        query = " ".join(override_query.strip().split())
        return MusicProfile(query, "Custom", "Commercial", "Fashion")

    filename = Path(video_path).stem if video_path else ""
    haystack = " ".join([product_name, caption, filename])
    tokens = _tokens(haystack)

    best_profile = DEFAULT_PROFILE
    best_score = 0
    for keywords, profile in PROFILES:
        score = len(tokens & keywords)
        if score > best_score:
            best_profile = profile
            best_score = score
    return best_profile


def commercial_music_query(
    product_name: str,
    caption: str = "",
    video_path: str | Path | None = None,
    override_query: str | None = None,
) -> str:
    return choose_music_profile(product_name, caption, video_path, override_query).query
