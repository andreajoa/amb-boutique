#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from autoposter import MARKETS, add_item, list_items

VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v"}
MARKET_ROTATION = ["US", "CA", "UK", "AU", "NZ"]
DEFAULT_TIMEZONE = "America/Sao_Paulo"
DEFAULT_SLOTS = "09:00,12:00,15:00,18:00,21:00,23:00"
DEFAULT_SLOT_GRACE_MINUTES = 45


def dropbox_root() -> Path:
    return Path(
        os.getenv("AMB_TIKTOK_DROPBOX", str(Path.home() / "Downloads" / "AMB-TikTok"))
    ).expanduser().resolve()


def ensure_folders(root: Path | None = None) -> dict[str, Path]:
    base = root or dropbox_root()
    folders = {
        "root": base,
        "inbox": base / "inbox",
        "published": base / "published",
        "failed": base / "failed",
        # Kept only for backward compatibility with older queued files.
        "queued": base / "queued",
    }
    for path in folders.values():
        path.mkdir(parents=True, exist_ok=True)
    return folders


def parse_slots(value: str | None = None) -> list[tuple[int, int]]:
    raw = value or os.getenv("AMB_TIKTOK_SLOTS", DEFAULT_SLOTS)
    slots: list[tuple[int, int]] = []
    for part in raw.split(","):
        text = part.strip()
        if not text:
            continue
        hour_text, minute_text = text.split(":", 1)
        hour, minute = int(hour_text), int(minute_text)
        if hour not in range(24) or minute not in range(60):
            raise ValueError(f"Invalid publication slot: {text}")
        slots.append((hour, minute))
    if not slots:
        raise ValueError("At least one publication slot is required")
    return sorted(set(slots))


def slot_grace_minutes(value: int | None = None) -> int:
    if value is not None:
        grace = int(value)
    else:
        grace = int(os.getenv("AMB_TIKTOK_SLOT_GRACE_MINUTES", str(DEFAULT_SLOT_GRACE_MINUTES)))
    if grace < 0 or grace > 180:
        raise ValueError("AMB_TIKTOK_SLOT_GRACE_MINUTES must be between 0 and 180")
    return grace


def next_available_slot(
    now: datetime,
    occupied_utc: set[str] | None = None,
    slots: list[tuple[int, int]] | None = None,
    timezone_name: str | None = None,
    grace_minutes: int | None = None,
) -> str:
    tz = ZoneInfo(timezone_name or os.getenv("AMB_TIKTOK_TIMEZONE", DEFAULT_TIMEZONE))
    local_now = now.astimezone(tz)
    occupied = occupied_utc or set()
    slot_list = slots or parse_slots()
    grace = timedelta(minutes=slot_grace_minutes(grace_minutes))

    for day_offset in range(0, 60):
        day = (local_now + timedelta(days=day_offset)).date()
        for hour, minute in slot_list:
            candidate_local = datetime(day.year, day.month, day.day, hour, minute, tzinfo=tz)
            candidate_utc = candidate_local.astimezone(timezone.utc).isoformat()
            if candidate_utc in occupied:
                continue

            if day_offset == 0 and candidate_local <= local_now:
                # A launchd cycle can start a few minutes after a named slot.
                # Keep a grace window so 18:07 still belongs to the 18:00 slot
                # instead of silently pushing the video to 21:00.
                if local_now - candidate_local <= grace:
                    return candidate_utc
                continue

            if candidate_local > local_now:
                return candidate_utc

    raise RuntimeError("Could not find a free TikTok publication slot in the next 60 days")


def product_from_filename(path: Path) -> str:
    text = path.stem.replace("_", " ").replace("-", " ")
    text = " ".join(text.split()).strip()
    return text.title() or "AMB Boutique Look"


def load_metadata(video: Path) -> dict:
    sidecar = video.with_suffix(".json")
    if not sidecar.exists():
        return {}
    data = json.loads(sidecar.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Metadata must be a JSON object: {sidecar}")
    return data


def metadata_bool(metadata: dict, key: str, default: bool) -> bool:
    if key not in metadata:
        return default
    value = metadata[key]
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
    raise ValueError(f"Metadata '{key}' must be a boolean")


def unique_destination(folder: Path, name: str) -> Path:
    candidate = folder / name
    if not candidate.exists():
        return candidate
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    source = Path(name)
    return folder / f"{source.stem}-{stamp}{source.suffix}"


def future_occupied_slots() -> set[str]:
    # Keep every queued/publishing timestamp occupied, including recently due
    # slots. Otherwise a new file detected at 18:10 could be assigned to the
    # same 18:00 slot that another queued item already owns.
    occupied: set[str] = set()
    for item in list_items():
        if item.status not in {"queued", "publishing"} or not item.scheduled_for:
            continue
        try:
            dt = datetime.fromisoformat(item.scheduled_for.replace("Z", "+00:00"))
        except ValueError:
            continue
        occupied.add(dt.astimezone(timezone.utc).isoformat())
    return occupied


def tracked_active_paths() -> set[str]:
    tracked: set[str] = set()
    for item in list_items():
        if item.status not in {"queued", "publishing", "published"}:
            continue
        try:
            tracked.add(str(Path(item.video_path).expanduser().resolve()))
        except OSError:
            continue
    return tracked


def move_failed_intake(video: Path, sidecar: Path, folders: dict[str, Path]) -> None:
    failed_day = folders["failed"] / datetime.now().strftime("%Y-%m-%d")
    failed_day.mkdir(parents=True, exist_ok=True)
    failed_video = unique_destination(failed_day, video.name)
    if video.exists():
        shutil.move(str(video), str(failed_video))
    if sidecar.exists():
        shutil.move(str(sidecar), str(failed_video.with_suffix(".json")))


def scan_inbox(root: Path | None = None) -> list[int]:
    folders = ensure_folders(root)
    videos = sorted(
        p for p in folders["inbox"].iterdir()
        if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS
    )
    if not videos:
        return []

    queued_ids: list[int] = []
    occupied = future_occupied_slots()
    all_items = list_items()
    existing_count = len(all_items)
    tracked = tracked_active_paths()

    for index, source_video in enumerate(videos):
        resolved_source = str(source_video.resolve())
        if resolved_source in tracked:
            print(f"Already tracked, leaving in inbox until publication: {source_video.name}")
            continue

        source_sidecar = source_video.with_suffix(".json")
        try:
            metadata = load_metadata(source_video)
            market = str(metadata.get("market") or MARKET_ROTATION[(existing_count + index) % len(MARKET_ROTATION)]).upper()
            if market not in MARKETS:
                raise ValueError(f"Unsupported market '{market}' for {source_video.name}")

            product = str(metadata.get("product") or product_from_filename(source_video)).strip()
            url = str(metadata.get("url") or "").strip()
            caption = metadata.get("caption")
            publish_at = metadata.get("publish_at")
            music_query = str(metadata.get("music_query") or "").strip() or None
            music_required = metadata_bool(metadata, "music_required", True)
            if not publish_at:
                publish_at = next_available_slot(datetime.now(timezone.utc), occupied_utc=occupied)
                occupied.add(publish_at)

            # Important invariant: the video remains in inbox while queued.
            # Its presence means it has not yet been confirmed as published.
            item_id = add_item(
                str(source_video),
                product,
                market,
                url,
                str(caption).strip() if caption else None,
                str(publish_at),
                music_query=music_query,
                music_required=music_required,
            )
        except Exception:
            move_failed_intake(source_video, source_sidecar, folders)
            raise

        queued_ids.append(item_id)
        tracked.add(resolved_source)
        music_note = "with automatic original soundtrack" if music_required else "without music"
        print(
            f"Auto-queued #{item_id}: {source_video.name} -> {publish_at} [{market}] "
            f"({music_note}; kept in inbox until success)"
        )

    return queued_ids


if __name__ == "__main__":
    ids = scan_inbox()
    if not ids:
        print("No new videos in AMB TikTok inbox.")