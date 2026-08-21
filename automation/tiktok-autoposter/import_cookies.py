#!/usr/bin/env python3
from __future__ import annotations

import argparse
import pickle
from pathlib import Path

ALLOWED_DOMAINS = {".tiktok.com", ".www.tiktok.com", "www.tiktok.com"}
REQUIRED = {"sessionid", "tt-target-idc"}


def parse_netscape(path: Path) -> list[dict]:
    cookies: list[dict] = []
    for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if not raw.strip() or raw.startswith("#"):
            continue
        parts = raw.split("\t")
        if len(parts) != 7:
            continue
        domain, _, cookie_path, secure, expires, name, value = parts
        if domain not in ALLOWED_DOMAINS:
            continue
        item = {
            "domain": domain,
            "path": cookie_path or "/",
            "secure": secure.upper() == "TRUE",
            "name": name,
            "value": value,
        }
        try:
            exp = int(expires)
            if exp > 0:
                item["expiry"] = exp
        except ValueError:
            pass
        cookies.append(item)
    return cookies


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import only TikTok cookies from a Netscape cookie export"
    )
    parser.add_argument("source")
    parser.add_argument("--account", default="amb-boutique")
    parser.add_argument(
        "--vendor",
        default=str(Path(__file__).resolve().parent / "vendor" / "TiktokAutoUploader"),
    )
    args = parser.parse_args()

    source = Path(args.source).expanduser().resolve()
    vendor = Path(args.vendor).expanduser().resolve()
    if not source.exists():
        raise SystemExit(f"Source cookie file not found: {source}")

    cookies = parse_netscape(source)
    names = {cookie["name"] for cookie in cookies}
    missing = sorted(REQUIRED - names)
    if missing:
        raise SystemExit(
            "TikTok session is incomplete. Missing required cookie(s): "
            + ", ".join(missing)
        )

    keep_names = {
        "sessionid", "sessionid_ss", "sid_tt", "sid_guard", "tt-target-idc",
        "tt-target-idc-sign", "ttwid", "msToken", "csrftoken", "tt_csrf_token",
        "passport_csrf_token", "passport_csrf_token_default", "uid_tt", "uid_tt_ss",
    }
    selected = [cookie for cookie in cookies if cookie["name"] in keep_names]
    out_dir = vendor / "CookiesDir"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"tiktok_session-{args.account}.cookie"
    with out.open("wb") as handle:
        pickle.dump(selected, handle)

    print(f"Imported {len(selected)} TikTok-only cookies for account '{args.account}'.")
    print(f"Saved locally to: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
