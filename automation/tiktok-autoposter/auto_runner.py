#!/usr/bin/env python3
from __future__ import annotations

import shutil
from pathlib import Path

from auto_queue import ensure_folders, scan_inbox
from autoposter import next_item, post


def archive_if_local(video_path: str) -> None:
    folders = ensure_folders()
    source = Path(video_path)
    try:
        source.relative_to(folders["queued"])
    except ValueError:
        return
    if not source.exists():
        return
    target = folders["published"] / source.name
    if target.exists():
        target = folders["published"] / f"published-{source.name}"
    shutil.move(str(source), str(target))
    sidecar = source.with_suffix(".json")
    if sidecar.exists():
        shutil.move(str(sidecar), str(target.with_suffix(".json")))


def main() -> int:
    scan_inbox()
    item = next_item()
    if not item:
        print("No TikTok video is due for publication.")
        return 0
    result = post(item, visibility="public", dry_run=False)
    if result == 0:
        archive_if_local(item.video_path)
    return result


if __name__ == "__main__":
    raise SystemExit(main())
