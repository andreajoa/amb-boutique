#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "autoposter.db"
DEFAULT_VENDOR = ROOT / "vendor" / "TiktokAutoUploader"
CONFIG_PATH = ROOT / "config.json"

PORTUGUESE_BLOCKLIST = {
    "agora", "compre", "comprar", "frete", "grátis", "gratis", "loja", "moda",
    "roupa", "roupas", "vestido", "vestidos", "blusa", "saia", "calça", "calca",
    "novidade", "novidades", "promoção", "promocao", "desconto", "envio", "entrega",
    "mulher", "feminina", "feminino", "clique", "coleção", "colecao",
}

MARKETS = {
    "US": {"label": "United States", "hashtags": ["#WomensFashion", "#StyleInspo", "#OOTD", "#FashionFinds"]},
    "CA": {"label": "Canada", "hashtags": ["#CanadaFashion", "#WomensStyle", "#OOTD", "#FashionFinds"]},
    "UK": {"label": "United Kingdom", "hashtags": ["#UKFashion", "#WomensStyle", "#OOTD", "#StyleInspo"]},
    "AU": {"label": "Australia", "hashtags": ["#AustraliaFashion", "#WomensStyle", "#OOTD", "#StyleInspo"]},
    "NZ": {"label": "New Zealand", "hashtags": ["#NZFashion", "#WomensStyle", "#OOTD", "#FashionFinds"]},
}


@dataclass
class QueueItem:
    id: int
    video_path: str
    product_name: str
    product_url: str
    market: str
    caption: str
    status: str
    created_at: str
    published_at: str | None
    error: str | None


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        return {}
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_path TEXT NOT NULL,
            product_name TEXT NOT NULL,
            product_url TEXT NOT NULL DEFAULT '',
            market TEXT NOT NULL,
            caption TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            created_at TEXT NOT NULL,
            published_at TEXT,
            error TEXT
        )
        """
    )
    conn.commit()
    return conn


def tokenize(text: str) -> set[str]:
    cleaned = "".join(ch.lower() if ch.isalpha() else " " for ch in text)
    return {x for x in cleaned.split() if x}


def assert_english_only(text: str) -> None:
    blocked = sorted(tokenize(text) & PORTUGUESE_BLOCKLIST)
    if blocked:
        raise ValueError(
            "Caption rejected by English-only policy. Portuguese terms found: "
            + ", ".join(blocked)
        )
    if not text.strip():
        raise ValueError("Caption cannot be empty")
    if len(text) > 2200:
        raise ValueError("Caption exceeds TikTok's 2200-character limit")


def default_caption(product_name: str, market: str, product_url: str = "") -> str:
    market = market.upper()
    if market not in MARKETS:
        raise ValueError(f"Unsupported market: {market}")
    tags = MARKETS[market]["hashtags"]
    lines = [
        f"A fresh look for your next outfit: {product_name}.",
        "Easy to style, easy to wear, and made for everyday confidence.",
    ]
    if product_url:
        lines.append("Shop the look through the link in our bio.")
    lines.append(" ".join(tags))
    caption = "\n\n".join(lines)
    assert_english_only(caption)
    return caption


def add_item(video: str, product: str, market: str, url: str, caption: str | None) -> int:
    market = market.upper()
    if market not in MARKETS:
        raise ValueError(f"Market must be one of: {', '.join(MARKETS)}")
    video_path = str(Path(video).expanduser().resolve())
    if not Path(video_path).exists():
        raise FileNotFoundError(video_path)
    final_caption = caption.strip() if caption else default_caption(product, market, url)
    assert_english_only(final_caption)
    created_at = datetime.now(timezone.utc).isoformat()
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO queue(video_path, product_name, product_url, market, caption, status, created_at) VALUES (?, ?, ?, ?, ?, 'queued', ?)",
            (video_path, product, url, market, final_caption, created_at),
        )
        conn.commit()
        return int(cur.lastrowid)


def rows_to_items(rows: Iterable[sqlite3.Row]) -> list[QueueItem]:
    return [QueueItem(**dict(r)) for r in rows]


def list_items() -> list[QueueItem]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM queue ORDER BY id ASC").fetchall()
    return rows_to_items(rows)


def next_item() -> QueueItem | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM queue WHERE status='queued' ORDER BY id ASC LIMIT 1"
        ).fetchone()
    return QueueItem(**dict(row)) if row else None


def vendor_path() -> Path:
    value = os.getenv("TIKTOK_UPLOADER_PATH")
    return Path(value).expanduser().resolve() if value else DEFAULT_VENDOR


def account_name() -> str:
    name = os.getenv("TIKTOK_ACCOUNT_NAME", "amb-boutique").strip()
    if not name:
        raise RuntimeError("TIKTOK_ACCOUNT_NAME is empty")
    return name


def upstream_cookie_path(vendor: Path, account: str) -> Path:
    return vendor / "CookiesDir" / f"tiktok_session-{account}.cookie"


def preflight(item: QueueItem) -> tuple[Path, str]:
    assert_english_only(item.caption)
    video = Path(item.video_path)
    if not video.exists():
        raise FileNotFoundError(f"Video no longer exists: {video}")
    vendor = vendor_path()
    cli = vendor / "cli.py"
    if not cli.exists():
        raise FileNotFoundError(
            f"TikTok uploader dependency not found at {vendor}. Run ./setup.sh or set TIKTOK_UPLOADER_PATH."
        )
    account = account_name()
    cookie = upstream_cookie_path(vendor, account)
    if not cookie.exists():
        raise FileNotFoundError(
            f"TikTok session not imported for account '{account}'. Run import_cookies.py first."
        )
    return cli, account


def mark(item_id: int, status: str, error: str | None = None) -> None:
    published_at = datetime.now(timezone.utc).isoformat() if status == "published" else None
    with connect() as conn:
        conn.execute(
            "UPDATE queue SET status=?, published_at=COALESCE(?, published_at), error=? WHERE id=?",
            (status, published_at, error, item_id),
        )
        conn.commit()


def post(item: QueueItem, visibility: str = "public", dry_run: bool = False) -> int:
    cli, account = preflight(item)
    vendor = cli.parent
    visibility_value = "0" if visibility == "public" else "1"
    cmd = [
        sys.executable,
        str(cli),
        "upload",
        "--user", account,
        "-v", item.video_path,
        "-t", item.caption,
        "-vi", visibility_value,
        "-ct", "1",
        "-d", "0",
        "-st", "0",
        "-ai", "0",
    ]
    if dry_run:
        safe = cmd.copy()
        safe[safe.index(item.caption)] = "<ENGLISH_CAPTION>"
        print(json.dumps({"dry_run": True, "command": safe, "item_id": item.id}, indent=2))
        return 0

    mark(item.id, "publishing")
    result = subprocess.run(cmd, cwd=vendor, text=True, capture_output=True)
    output = ((result.stdout or "") + "\n" + (result.stderr or "")).strip()
    if result.returncode == 0 and "Published successfully" in output:
        mark(item.id, "published")
        print(output)
        return 0
    mark(item.id, "failed", output[-4000:] if output else f"Uploader exited {result.returncode}")
    print(output, file=sys.stderr)
    return result.returncode or 1


def command_status() -> int:
    items = list_items()
    if not items:
        print("Queue is empty.")
        return 0
    for item in items:
        print(
            f"#{item.id} [{item.status}] {item.market} | {item.product_name} | {Path(item.video_path).name}"
        )
        if item.error:
            print(f"  error: {item.error.splitlines()[-1][:300]}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="English-only TikTok autoposter for women's fashion"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    add = sub.add_parser("add", help="Add a video to the publishing queue")
    add.add_argument("--video", required=True)
    add.add_argument("--product", required=True)
    add.add_argument("--market", required=True, choices=sorted(MARKETS))
    add.add_argument("--url", default="")
    add.add_argument("--caption")

    sub.add_parser("status", help="Show queue status")

    post_next = sub.add_parser("post-next", help="Publish the next queued video")
    post_next.add_argument("--visibility", choices=["public", "private"], default="public")
    post_next.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()
    try:
        if args.command == "add":
            item_id = add_item(args.video, args.product, args.market, args.url, args.caption)
            print(f"Queued item #{item_id}")
            return 0
        if args.command == "status":
            return command_status()
        if args.command == "post-next":
            item = next_item()
            if not item:
                print("No queued videos.")
                return 0
            return post(item, visibility=args.visibility, dry_run=args.dry_run)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
