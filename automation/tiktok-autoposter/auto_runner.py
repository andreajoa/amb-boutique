#!/usr/bin/env python3
from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from auto_queue import DEFAULT_TIMEZONE, ensure_folders, scan_inbox, unique_destination
from autoposter import connect, list_items, next_item, post


def update_item_video_path(item_id: int, new_path: Path) -> None:
    with connect() as conn:
        conn.execute("UPDATE queue SET video_path=? WHERE id=?", (str(new_path.resolve()), item_id))
        conn.commit()


def local_publication_time(published_at: str | None = None) -> datetime:
    tz = ZoneInfo(DEFAULT_TIMEZONE)
    if published_at:
        try:
            dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(tz)
        except ValueError:
            pass
    return datetime.now(tz)


def published_archive_target(published_root: Path, source_name: str, published_at: str | None = None) -> Path:
    local_dt = local_publication_time(published_at)
    day_folder = published_root / local_dt.strftime("%Y-%m-%d")
    day_folder.mkdir(parents=True, exist_ok=True)
    stamp = local_dt.strftime("%Y-%m-%d_%H-%M-%S")
    source = Path(source_name)
    return unique_destination(day_folder, f"{stamp}__{source.name}")


def failed_archive_target(failed_root: Path, source_name: str) -> Path:
    local_dt = datetime.now(ZoneInfo(DEFAULT_TIMEZONE))
    day_folder = failed_root / local_dt.strftime("%Y-%m-%d")
    day_folder.mkdir(parents=True, exist_ok=True)
    stamp = local_dt.strftime("%Y-%m-%d_%H-%M-%S")
    source = Path(source_name)
    return unique_destination(day_folder, f"{stamp}__FAILED__{source.name}")


def move_with_sidecar(source: Path, target: Path) -> None:
    source_sidecar = source.with_suffix(".json")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(source), str(target))
    if source_sidecar.exists():
        shutil.move(str(source_sidecar), str(target.with_suffix(".json")))


def is_managed_pending_file(source: Path, folders: dict[str, Path]) -> bool:
    for key in ("inbox", "queued"):
        try:
            source.relative_to(folders[key])
            return True
        except ValueError:
            continue
    return False


def archive_published(item_id: int, video_path: str, published_at: str | None = None) -> Path | None:
    folders = ensure_folders()
    source = Path(video_path).expanduser().resolve()
    if not source.exists() or not is_managed_pending_file(source, folders):
        return None

    target = published_archive_target(folders["published"], source.name, published_at)
    move_with_sidecar(source, target)
    update_item_video_path(item_id, target)
    print(f"Archived published video: {target}")
    return target


def archive_failed(item_id: int, video_path: str) -> Path | None:
    folders = ensure_folders()
    source = Path(video_path).expanduser().resolve()
    if not source.exists() or not is_managed_pending_file(source, folders):
        return None

    target = failed_archive_target(folders["failed"], source.name)
    move_with_sidecar(source, target)
    update_item_video_path(item_id, target)
    print(f"Moved failed publication out of inbox: {target}")
    return target


def reconcile_finished_items() -> None:
    # Handles a rare crash after TikTok confirms success but before the file move.
    # It also keeps the inbox invariant true on the next scheduler execution.
    for item in list_items():
        if item.status == "published":
            archive_published(item.id, item.video_path, item.published_at)
        elif item.status == "failed":
            archive_failed(item.id, item.video_path)


def current_item(item_id: int):
    for item in list_items():
        if item.id == item_id:
            return item
    return None


def main() -> int:
    reconcile_finished_items()
    scan_inbox()

    item = next_item()
    if not item:
        print("No TikTok video is due for publication.")
        return 0

    result = post(item, visibility="public", dry_run=False)
    refreshed = current_item(item.id)
    if result == 0:
        archive_published(
            item.id,
            item.video_path,
            refreshed.published_at if refreshed else None,
        )
    else:
        archive_failed(item.id, item.video_path)
    return result


if __name__ == "__main__":
    raise SystemExit(main())
