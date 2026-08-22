#!/usr/bin/env python3
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from auto_queue import DEFAULT_TIMEZONE, ensure_folders, scan_inbox, unique_destination
from autoposter import connect, list_items, mark, next_item

ROOT = Path(__file__).resolve().parent
DEFAULT_RETRY_DELAY_SECONDS = 120
DEFAULT_MAX_ATTEMPTS = 6
DEFAULT_UPLOAD_TIMEOUT_SECONDS = 180


def env_int(name: str, default: int, minimum: int, maximum: int) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc
    if value < minimum or value > maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    return value


def retry_delay_seconds() -> int:
    return env_int("AMB_TIKTOK_RETRY_DELAY_SECONDS", DEFAULT_RETRY_DELAY_SECONDS, 15, 3600)


def max_attempts() -> int:
    return env_int("AMB_TIKTOK_MAX_ATTEMPTS", DEFAULT_MAX_ATTEMPTS, 1, 20)


def upload_timeout_seconds() -> int:
    return env_int("AMB_TIKTOK_UPLOAD_TIMEOUT_SECONDS", DEFAULT_UPLOAD_TIMEOUT_SECONDS, 30, 1800)


def ensure_retry_table() -> None:
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS retry_state (
                item_id INTEGER PRIMARY KEY,
                attempts INTEGER NOT NULL DEFAULT 0,
                last_started_at TEXT,
                last_error TEXT
            )
            """
        )
        conn.commit()


def retry_attempts(item_id: int) -> int:
    ensure_retry_table()
    with connect() as conn:
        row = conn.execute(
            "SELECT attempts FROM retry_state WHERE item_id=?",
            (item_id,),
        ).fetchone()
    return int(row[0]) if row else 0


def record_attempt_start(item_id: int) -> int:
    ensure_retry_table()
    started_at = datetime.now(timezone.utc).isoformat()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO retry_state(item_id, attempts, last_started_at, last_error)
            VALUES (?, 1, ?, NULL)
            ON CONFLICT(item_id) DO UPDATE SET
                attempts=retry_state.attempts + 1,
                last_started_at=excluded.last_started_at
            """,
            (item_id, started_at),
        )
        row = conn.execute(
            "SELECT attempts FROM retry_state WHERE item_id=?",
            (item_id,),
        ).fetchone()
        conn.commit()
    return int(row[0])


def ensure_attempt_record(item_id: int) -> int:
    attempts = retry_attempts(item_id)
    if attempts:
        return attempts
    return record_attempt_start(item_id)


def clear_retry_state(item_id: int) -> None:
    ensure_retry_table()
    with connect() as conn:
        conn.execute("DELETE FROM retry_state WHERE item_id=?", (item_id,))
        conn.commit()


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
        clear_retry_state(item_id)
        return None

    target = published_archive_target(folders["published"], source.name, published_at)
    move_with_sidecar(source, target)
    update_item_video_path(item_id, target)
    clear_retry_state(item_id)
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
    clear_retry_state(item_id)
    print(f"Moved failed publication out of inbox: {target}")
    return target


def current_item(item_id: int):
    for item in list_items():
        if item.id == item_id:
            return item
    return None


def retry_error_message(attempts: int, error: str, next_at: str | None) -> str:
    cleaned = " ".join((error or "Unknown TikTok publication error").split())
    if len(cleaned) > 3000:
        cleaned = cleaned[-3000:]
    if next_at:
        return f"[retry {attempts}/{max_attempts()} next={next_at}] {cleaned}"
    return f"[final attempt {attempts}/{max_attempts()}] {cleaned}"


def schedule_retry(item_id: int, error: str, attempts: int | None = None) -> bool:
    attempts = attempts if attempts is not None else ensure_attempt_record(item_id)
    maximum = max_attempts()
    if attempts >= maximum:
        final_error = retry_error_message(attempts, error, None)
        mark(item_id, "failed", final_error)
        with connect() as conn:
            conn.execute(
                "UPDATE retry_state SET last_error=? WHERE item_id=?",
                (final_error, item_id),
            )
            conn.commit()
        print(f"TikTok publication exhausted {attempts}/{maximum} attempts.", file=sys.stderr)
        return False

    next_at = (datetime.now(timezone.utc) + timedelta(seconds=retry_delay_seconds())).isoformat()
    retry_error = retry_error_message(attempts, error, next_at)
    with connect() as conn:
        conn.execute(
            "UPDATE queue SET status='queued', scheduled_for=?, error=? WHERE id=?",
            (next_at, retry_error, item_id),
        )
        conn.execute(
            "UPDATE retry_state SET last_error=? WHERE item_id=?",
            (retry_error, item_id),
        )
        conn.commit()
    print(
        f"TikTok publication will retry item #{item_id} in {retry_delay_seconds()}s "
        f"(attempt {attempts}/{maximum})."
    )
    return True


def reconcile_finished_items() -> None:
    # launchd does not run two copies of the same job at once. Therefore a
    # 'publishing' row found at process startup belongs to an interrupted prior
    # run and can safely be returned to the retry queue.
    folders = ensure_folders()
    for item in list_items():
        if item.status == "published":
            archive_published(item.id, item.video_path, item.published_at)
            continue

        if item.status not in {"failed", "publishing"}:
            continue

        source = Path(item.video_path).expanduser().resolve()
        if not source.exists() or not is_managed_pending_file(source, folders):
            continue

        attempts = ensure_attempt_record(item.id)
        if item.status == "publishing":
            error = item.error or "Recovered an interrupted TikTok publishing attempt after runner restart"
        else:
            error = item.error or "Recovered a failed TikTok publishing attempt before archival"

        if not schedule_retry(item.id, error, attempts=attempts):
            archive_failed(item.id, item.video_path)


def run_post_with_timeout(item_id: int) -> tuple[int, str]:
    timeout = upload_timeout_seconds()
    cmd = [
        sys.executable,
        str(ROOT / "autoposter.py"),
        "post-next",
        "--visibility",
        "public",
    ]
    try:
        result = subprocess.run(
            cmd,
            cwd=ROOT,
            text=True,
            capture_output=True,
            timeout=timeout,
        )
        stdout = (result.stdout or "").strip()
        stderr = (result.stderr or "").strip()
        if stdout:
            print(stdout)
        if stderr:
            print(stderr, file=sys.stderr)
        combined = "\n".join(part for part in (stdout, stderr) if part).strip()
        return result.returncode, combined
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        stderr = exc.stderr.decode() if isinstance(exc.stderr, bytes) else (exc.stderr or "")
        if stdout.strip():
            print(stdout.strip())
        if stderr.strip():
            print(stderr.strip(), file=sys.stderr)
        message = f"TikTok upload timed out after {timeout}s and was terminated so the scheduler can retry"
        print(message, file=sys.stderr)
        return 124, message


def main() -> int:
    ensure_retry_table()
    reconcile_finished_items()
    scan_inbox()

    item = next_item()
    if not item:
        print("No TikTok video is due for publication.")
        return 0

    attempts = record_attempt_start(item.id)
    if attempts > max_attempts():
        error = f"TikTok publication attempt limit already exceeded ({attempts}/{max_attempts()})"
        mark(item.id, "failed", error)
        archive_failed(item.id, item.video_path)
        return 1

    print(f"Starting TikTok publication for item #{item.id} (attempt {attempts}/{max_attempts()}).")
    returncode, output = run_post_with_timeout(item.id)
    refreshed = current_item(item.id)

    if returncode == 0 and refreshed and refreshed.status == "published":
        archive_published(item.id, item.video_path, refreshed.published_at)
        return 0

    latest_error = output
    if refreshed and refreshed.error:
        latest_error = refreshed.error
    if not latest_error:
        latest_error = f"TikTok uploader exited with code {returncode} without confirming publication"

    if schedule_retry(item.id, latest_error, attempts=attempts):
        # The scheduler itself is healthy; this was a recoverable publication
        # failure and the item remains in inbox for the next automatic attempt.
        return 0

    archive_failed(item.id, item.video_path)
    return returncode or 1


if __name__ == "__main__":
    raise SystemExit(main())
