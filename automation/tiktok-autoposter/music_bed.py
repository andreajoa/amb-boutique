#!/usr/bin/env python3
from __future__ import annotations

import math
import os
import subprocess
import wave
from array import array
from dataclasses import dataclass
from pathlib import Path

import imageio_ffmpeg

from music_selector import MusicProfile, choose_music_profile

SAMPLE_RATE = 44100
ROOT = Path(__file__).resolve().parent
CACHE_DIR = ROOT / "data" / "music-cache"
PREPARED_DIR = ROOT / "data" / "prepared"


@dataclass(frozen=True)
class MusicBed:
    path: Path
    title: str
    bpm: int
    style: str


@dataclass(frozen=True)
class StyleSpec:
    bpm: int
    roots: tuple[int, int, int, int]
    quality: str
    bass_gain: float
    pad_gain: float
    beat_gain: float
    melody_gain: float
    title: str


STYLES: dict[str, StyleSpec] = {
    "summer": StyleSpec(114, (60, 55, 57, 53), "major", 0.13, 0.16, 0.20, 0.08, "Bright Summer Fashion"),
    "cozy": StyleSpec(92, (57, 53, 60, 55), "soft", 0.10, 0.19, 0.10, 0.06, "Soft Cozy Fashion"),
    "romantic": StyleSpec(94, (57, 53, 60, 55), "soft", 0.10, 0.20, 0.09, 0.07, "Romantic Elegant Fashion"),
    "street": StyleSpec(102, (50, 46, 53, 48), "minor", 0.20, 0.10, 0.22, 0.04, "Cool Street Fashion"),
    "active": StyleSpec(126, (52, 48, 55, 50), "minor", 0.18, 0.10, 0.28, 0.06, "Dynamic Active Fashion"),
    "modern": StyleSpec(118, (57, 53, 60, 55), "minor", 0.15, 0.14, 0.20, 0.06, "Modern Confident Fashion"),
    "chic": StyleSpec(110, (57, 53, 60, 55), "minor", 0.14, 0.17, 0.17, 0.07, "Chic Evening Fashion"),
    "default": StyleSpec(116, (57, 53, 60, 55), "minor", 0.14, 0.15, 0.19, 0.06, "Stylish Upbeat Fashion"),
}


def style_key(profile: MusicProfile) -> str:
    text = f"{profile.query} {profile.mood} {profile.genre} {profile.theme}".lower()
    if any(word in text for word in ("summer", "happy", "beach", "bright")):
        return "summer"
    if any(word in text for word in ("cozy", "chill", "soft")):
        return "cozy"
    if "romantic" in text:
        return "romantic"
    if any(word in text for word in ("street", "hip hop", "cool")):
        return "street"
    if any(word in text for word in ("workout", "dynamic", "sports", "active")):
        return "active"
    if any(word in text for word in ("modern", "electronic", "business")):
        return "modern"
    if any(word in text for word in ("chic", "evening", "glam")):
        return "chic"
    return "default"


def midi_hz(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def clamp(value: float) -> float:
    return max(-1.0, min(1.0, value))


def chord_intervals(quality: str) -> tuple[int, int, int]:
    if quality == "major":
        return (0, 4, 7)
    if quality == "soft":
        return (0, 3, 7)
    return (0, 3, 7)


def _kick(local_seconds: float) -> float:
    if local_seconds < 0 or local_seconds > 0.32:
        return 0.0
    env = math.exp(-12.0 * local_seconds)
    freq = 48.0 + 62.0 * math.exp(-10.0 * local_seconds)
    return math.sin(2 * math.pi * freq * local_seconds) * env


def _snare(t: float, local_seconds: float) -> float:
    if local_seconds < 0 or local_seconds > 0.22:
        return 0.0
    env = math.exp(-16.0 * local_seconds)
    noise = (
        math.sin(2 * math.pi * 1721 * t)
        + math.sin(2 * math.pi * 2417 * t + 0.7)
        + math.sin(2 * math.pi * 3181 * t + 1.3)
    ) / 3.0
    return noise * env


def _hat(t: float, local_seconds: float) -> float:
    if local_seconds < 0 or local_seconds > 0.075:
        return 0.0
    env = math.exp(-38.0 * local_seconds)
    return (
        math.sin(2 * math.pi * 6911 * t)
        + 0.55 * math.sin(2 * math.pi * 9419 * t + 0.4)
    ) * 0.5 * env


def generate_music_bed(profile: MusicProfile, cache_dir: Path | None = None) -> MusicBed:
    key = style_key(profile)
    spec = STYLES[key]
    target_dir = cache_dir or CACHE_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"amb-original-{key}-{spec.bpm}bpm.wav"
    if target.exists() and target.stat().st_size > 4096:
        return MusicBed(target, f"AMB Original — {spec.title}", spec.bpm, key)

    beat_seconds = 60.0 / spec.bpm
    beats = 32  # eight bars; the finished video loops this bed as needed
    duration = beats * beat_seconds
    total_frames = int(duration * SAMPLE_RATE)
    samples = array("h")
    intervals = chord_intervals(spec.quality)

    for index in range(total_frames):
        t = index / SAMPLE_RATE
        beat = t / beat_seconds
        beat_index = int(beat)
        beat_phase = beat - beat_index
        beat_local = beat_phase * beat_seconds
        half_phase = (beat * 2.0) % 1.0
        half_local = half_phase * (beat_seconds / 2.0)
        bar_beat = beat_index % 4
        chord_index = (beat_index // 4) % 4
        root = spec.roots[chord_index]

        pad = 0.0
        for interval in intervals:
            frequency = midi_hz(root + interval)
            pad += math.sin(2 * math.pi * frequency * t)
            pad += 0.22 * math.sin(2 * math.pi * frequency * 0.501 * t + 0.25)
        pad = (pad / (len(intervals) * 1.22)) * spec.pad_gain

        bass_env = 0.45 + 0.55 * math.exp(-2.8 * beat_phase)
        bass = math.sin(2 * math.pi * midi_hz(root - 12) * t) * bass_env * spec.bass_gain

        kick = _kick(beat_local) if bar_beat in (0, 2) else 0.0
        snare = _snare(t, beat_local) if bar_beat in (1, 3) else 0.0
        hat = _hat(t, half_local)
        beat_layer = (kick * 0.9 + snare * 0.55 + hat * 0.22) * spec.beat_gain

        melody_note = root + intervals[(beat_index // 2) % len(intervals)] + 12
        melody_env = max(0.0, 1.0 - beat_phase * 1.6)
        melody = math.sin(2 * math.pi * midi_hz(melody_note) * t) * melody_env * spec.melody_gain

        fade_in = min(1.0, t / 0.35)
        fade_out = min(1.0, max(0.0, (duration - t) / 0.35))
        mixed = clamp((pad + bass + beat_layer + melody) * fade_in * fade_out * 0.82)

        left = int(mixed * 32767)
        right_mod = 0.97 + 0.03 * math.sin(2 * math.pi * 0.21 * t)
        right = int(clamp(mixed * right_mod) * 32767)
        samples.append(left)
        samples.append(right)

    with wave.open(str(target), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(samples.tobytes())

    return MusicBed(target, f"AMB Original — {spec.title}", spec.bpm, key)


def video_has_audio(video: Path, ffmpeg: str) -> bool:
    probe = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", str(video)],
        text=True,
        capture_output=True,
    )
    return "Audio:" in (probe.stderr or "")


def _run_mix(command: list[str]) -> tuple[bool, str]:
    result = subprocess.run(command, text=True, capture_output=True)
    output = ((result.stdout or "") + "\n" + (result.stderr or "")).strip()
    return result.returncode == 0, output


def prepare_video_with_music(
    video: str | Path,
    product_name: str,
    caption: str,
    music_query: str | None = None,
    item_id: int | None = None,
) -> tuple[Path, str]:
    source = Path(video).expanduser().resolve()
    if not source.exists():
        raise FileNotFoundError(source)

    profile = choose_music_profile(
        product_name,
        caption,
        source,
        override_query=music_query,
    )
    bed = generate_music_bed(profile)
    PREPARED_DIR.mkdir(parents=True, exist_ok=True)
    token = str(item_id) if item_id is not None else "manual"
    output = PREPARED_DIR / f"prepared-{token}-{source.stem}.mp4"
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    music_volume = float(os.getenv("AMB_TIKTOK_MUSIC_VOLUME", "0.24"))
    source_volume = float(os.getenv("AMB_TIKTOK_SOURCE_AUDIO_VOLUME", "0.55"))
    has_audio = video_has_audio(source, ffmpeg)

    common = [
        ffmpeg,
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(source),
        "-stream_loop",
        "-1",
        "-i",
        str(bed.path),
    ]

    if has_audio:
        filter_graph = (
            f"[0:a:0]volume={source_volume}[source];"
            f"[1:a:0]volume={music_volume}[music];"
            "[source][music]amix=inputs=2:duration=longest:normalize=0[aout]"
        )
        mapping = ["-filter_complex", filter_graph, "-map", "0:v:0", "-map", "[aout]"]
    else:
        mapping = ["-map", "0:v:0", "-map", "1:a:0", "-af", f"volume={music_volume}"]

    copy_command = common + mapping + [
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        str(output),
    ]
    ok, error = _run_mix(copy_command)
    if not ok:
        encode_command = common + mapping + [
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(output),
        ]
        ok, fallback_error = _run_mix(encode_command)
        if not ok:
            raise RuntimeError(
                "Could not prepare the video with the original AMB music bed: "
                + (fallback_error or error)[-1800:]
            )

    if not output.exists() or output.stat().st_size < 1024:
        raise RuntimeError("Prepared music video was not created")
    return output, f"{bed.title} ({bed.bpm} BPM)"
