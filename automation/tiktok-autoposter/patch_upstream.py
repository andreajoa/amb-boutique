#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Cannot apply {label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Apply deterministic compatibility fixes to the pinned TikTok uploader"
    )
    parser.add_argument("--vendor", required=True)
    args = parser.parse_args()
    target = (
        Path(args.vendor).expanduser().resolve()
        / "tiktok_uploader"
        / "tiktok.py"
    )
    if not target.exists():
        raise SystemExit(f"Upstream file not found: {target}")

    text = target.read_text(encoding="utf-8")

    old_session = '''\tsession = requests.Session()\n\tsession.cookies.set("sessionid", session_id, domain=".tiktok.com")\n\tsession.cookies.set("tt-target-idc", dc_id, domain=".tiktok.com")\n\tsession.verify = True\n'''
    new_session = '''\tsession = requests.Session()\n\t# Load the complete TikTok-only cookie subset saved by our importer.\n\t# This preserves msToken/ttwid/CSRF state needed by the current web upload flow.\n\tfor cookie in cookies:\n\t\tname = cookie.get("name")\n\t\tvalue = cookie.get("value")\n\t\tif not name or value is None:\n\t\t\tcontinue\n\t\tdomain = cookie.get("domain") or ".tiktok.com"\n\t\tpath = cookie.get("path") or "/"\n\t\tsession.cookies.set(name, value, domain=domain, path=path)\n\tsession.verify = True\n'''
    text = replace_once(
        text,
        old_session,
        new_session,
        "full TikTok session cookie loading",
    )

    old_mstoken = '''\t\tmstoken = session.cookies.get("msToken")\n'''
    new_mstoken = '''\t\t# Browser exports may contain multiple msToken cookies for different\n\t\t# TikTok subdomains. requests.CookieJar.get() raises CookieConflictError\n\t\t# when the name is duplicated, so select one deterministically.\n\t\tms_tokens = [c for c in session.cookies if c.name == "msToken" and c.value]\n\t\tpreferred_ms_token = next(\n\t\t\t(c for c in ms_tokens if c.domain == "www.tiktok.com"),\n\t\t\tNone,\n\t\t)\n\t\tif preferred_ms_token is None:\n\t\t\tpreferred_ms_token = next(\n\t\t\t\t(c for c in ms_tokens if c.domain in (".tiktok.com", "tiktok.com")),\n\t\t\t\tNone,\n\t\t\t)\n\t\tif preferred_ms_token is None and ms_tokens:\n\t\t\tpreferred_ms_token = ms_tokens[0]\n\t\tmstoken = preferred_ms_token.value if preferred_ms_token else None\n'''
    text = replace_once(
        text,
        old_mstoken,
        new_mstoken,
        "duplicate msToken handling",
    )

    old_privacy = '''\t\t\t\t"privacy_setting_info": {\n\t\t\t\t\t"visibility_type": 0,\n\t\t\t\t\t"allow_duet": 1,\n\t\t\t\t\t"allow_stitch": 1,\n\t\t\t\t\t"allow_comment": 1\n\t\t\t\t}\n'''
    new_privacy = '''\t\t\t\t"privacy_setting_info": {\n\t\t\t\t\t"visibility_type": visibility_type,\n\t\t\t\t\t"allow_duet": allow_duet,\n\t\t\t\t\t"allow_stitch": allow_stitch,\n\t\t\t\t\t"allow_comment": allow_comment\n\t\t\t\t}\n'''
    text = replace_once(
        text,
        old_privacy,
        new_privacy,
        "privacy/comment settings",
    )

    target.write_text(text, encoding="utf-8")
    print(f"Applied compatibility patch to {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
