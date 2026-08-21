#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import pickle
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Iterable

from selenium.common.exceptions import WebDriverException
from selenium.webdriver.common.keys import Keys
import undetected_chromedriver as uc

ROOT = Path(__file__).resolve().parent
STUDIO_UPLOAD_URL = "https://www.tiktok.com/tiktokstudio/upload?from=creator_center"
TIKTOK_HOME = "https://www.tiktok.com/"


class StudioMusicError(RuntimeError):
    pass


def _truthy(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _normalize(text: str) -> str:
    return " ".join((text or "").split()).strip()


def cookie_path(vendor: Path, account: str) -> Path:
    return vendor / "CookiesDir" / f"tiktok_session-{account}.cookie"


def load_session_cookies(path: Path) -> list[dict]:
    if not path.exists():
        raise StudioMusicError(f"TikTok session file is missing for account: {path.name}")
    with path.open("rb") as handle:
        raw = pickle.load(handle)
    if not isinstance(raw, list):
        raise StudioMusicError("TikTok session file has an unexpected format")
    cookies: list[dict] = []
    for item in raw:
        if not isinstance(item, dict) or not item.get("name") or "value" not in item:
            continue
        cookie = {
            "name": str(item["name"]),
            "value": str(item["value"]),
            "path": str(item.get("path") or "/"),
        }
        domain = str(item.get("domain") or ".tiktok.com")
        if domain.lstrip(".").endswith("tiktok.com"):
            cookie["domain"] = domain
        if item.get("secure") is not None:
            cookie["secure"] = bool(item.get("secure"))
        expiry = item.get("expiry")
        if isinstance(expiry, (int, float)) and int(expiry) > int(time.time()):
            cookie["expiry"] = int(expiry)
        cookies.append(cookie)
    names = {c["name"] for c in cookies}
    if "sessionid" not in names:
        raise StudioMusicError("TikTok session is missing sessionid; import fresh TikTok cookies")
    return cookies


def build_driver(headless: bool):
    options = uc.ChromeOptions()
    options.add_argument("--window-size=1440,1200")
    options.add_argument("--lang=en-US")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")
    options.add_experimental_option("prefs", {"intl.accept_languages": "en-US,en"})
    if headless:
        options.add_argument("--headless=new")
    return uc.Chrome(options=options)


def inject_cookies(driver, cookies: Iterable[dict]) -> None:
    driver.get(TIKTOK_HOME)
    time.sleep(1)
    accepted = 0
    for cookie in cookies:
        try:
            driver.add_cookie(cookie)
            accepted += 1
        except WebDriverException:
            # Some browser exports include host-specific cookies that Chrome
            # rejects on www.tiktok.com. The core .tiktok.com session cookies
            # are still enough and are attempted independently.
            continue
    if accepted == 0:
        raise StudioMusicError("Chrome rejected the imported TikTok session cookies")
    driver.get(TIKTOK_HOME)
    time.sleep(1)


def page_text(driver) -> str:
    try:
        return _normalize(driver.execute_script("return document.body ? document.body.innerText : ''") or "")
    except WebDriverException:
        return ""


def click_text(driver, labels: Iterable[str], timeout: float = 20, exact: bool = True) -> str | None:
    labels = [_normalize(x).lower() for x in labels if _normalize(x)]
    deadline = time.time() + timeout
    script = r"""
const labels = arguments[0];
const exact = arguments[1];
const nodes = Array.from(document.querySelectorAll('button,[role="button"],a,[role="tab"],span,div'));
function visible(el) {
  const r = el.getBoundingClientRect();
  const s = window.getComputedStyle(el);
  return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
}
for (const el of nodes) {
  if (!visible(el)) continue;
  const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!t) continue;
  for (const label of labels) {
    if ((exact && t === label) || (!exact && t.includes(label))) {
      el.click();
      return t;
    }
  }
}
return null;
"""
    while time.time() < deadline:
        driver.switch_to.default_content()
        try:
            result = driver.execute_script(script, labels, exact)
            if result:
                return str(result)
        except WebDriverException:
            pass
        time.sleep(0.5)
    return None


def find_visible_file_input(driver, timeout: float = 90):
    deadline = time.time() + timeout
    while time.time() < deadline:
        driver.switch_to.default_content()
        try:
            inputs = driver.find_elements("css selector", 'input[type="file"]')
            for element in inputs:
                if element.is_enabled():
                    return element
        except WebDriverException:
            pass
        time.sleep(0.5)
    raise StudioMusicError("TikTok Studio upload input was not found")


def click_edit_video_if_available(driver) -> None:
    # Upload processing can take a while. If the editor is already open,
    # Audio/Music will appear and this step is skipped.
    deadline = time.time() + 240
    while time.time() < deadline:
        text = page_text(driver).lower()
        if "audio" in text and "music" in text:
            return
        clicked = click_text(driver, ["Edit video", "Edit video in Studio"], timeout=1, exact=True)
        if clicked:
            time.sleep(3)
            return
        time.sleep(1)
    raise StudioMusicError("TikTok finished receiving the video but the editor did not become available")


def find_search_input(driver, timeout: float = 25):
    deadline = time.time() + timeout
    while time.time() < deadline:
        driver.switch_to.default_content()
        try:
            candidates = driver.find_elements("css selector", "input")
            visible = []
            for element in candidates:
                if not element.is_displayed() or not element.is_enabled():
                    continue
                placeholder = (element.get_attribute("placeholder") or "").lower()
                aria = (element.get_attribute("aria-label") or "").lower()
                score = int("search" in placeholder) * 3 + int("search" in aria) * 3 + int("music" in placeholder + aria) * 2
                visible.append((score, element))
            if visible:
                visible.sort(key=lambda pair: pair[0], reverse=True)
                if visible[0][0] > 0:
                    return visible[0][1]
        except WebDriverException:
            pass
        time.sleep(0.5)
    raise StudioMusicError("Commercial Sounds search field was not found")


def clear_and_type(element, value: str) -> None:
    element.click()
    modifier = Keys.COMMAND if sys.platform == "darwin" else Keys.CONTROL
    element.send_keys(modifier, "a")
    element.send_keys(value)
    element.send_keys(Keys.ENTER)


def first_use_button_and_card(driver, timeout: float = 25) -> tuple[object, str]:
    deadline = time.time() + timeout
    script = r"""
const nodes = Array.from(document.querySelectorAll('button,[role="button"]'));
function visible(el) {
  const r = el.getBoundingClientRect();
  const s = window.getComputedStyle(el);
  return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
}
for (const el of nodes) {
  if (!visible(el)) continue;
  const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (t !== 'use') continue;
  let card = el;
  let best = '';
  for (let i = 0; i < 6 && card; i++, card = card.parentElement) {
    const text = (card.innerText || '').replace(/\s+/g, ' ').trim();
    if (text.length >= 8 && text.length <= 500) best = text;
  }
  el.setAttribute('data-amb-music-use', '1');
  return best || 'Commercial Sound';
}
return null;
"""
    while time.time() < deadline:
        driver.switch_to.default_content()
        try:
            card = driver.execute_script(script)
            if card:
                element = driver.find_element("css selector", '[data-amb-music-use="1"]')
                return element, _normalize(str(card))[:400]
        except WebDriverException:
            pass
        time.sleep(0.5)
    raise StudioMusicError("No usable Commercial Sound result was found")


def select_commercial_music(driver, query: str, require_commercial: bool = True) -> str:
    click_edit_video_if_available(driver)

    click_text(driver, ["Audio"], timeout=20, exact=True)
    click_text(driver, ["Music"], timeout=20, exact=True)
    time.sleep(1)

    # Business accounts normally expose only Commercial Sounds. We still
    # explicitly enter the Commercial Sounds surface when TikTok presents it.
    commercial_clicked = click_text(
        driver,
        ["Commercial Sounds", "Commercial sounds", "Commercial Music", "Commercial music"],
        timeout=6,
        exact=True,
    )
    time.sleep(1)
    commercial_visible = "commercial" in page_text(driver).lower()
    if require_commercial and not commercial_clicked and not commercial_visible:
        raise StudioMusicError(
            "TikTok did not confirm a Commercial Sounds context; refusing to select general-library music"
        )

    search = find_search_input(driver)
    search_terms = [query, "fashion", "upbeat fashion"]
    last_error: Exception | None = None
    for term in dict.fromkeys(_normalize(x) for x in search_terms if _normalize(x)):
        try:
            clear_and_type(search, term)
            time.sleep(2)
            use_button, card_text = first_use_button_and_card(driver, timeout=12)
            use_button.click()
            time.sleep(2)
            # A selected track normally changes the editor/timeline. We do not
            # rely on a single fragile CSS class; the successful click plus the
            # commercial context is the selection evidence.
            click_text(driver, ["Save edits", "Save"], timeout=25, exact=True)
            time.sleep(3)
            return card_text
        except Exception as exc:  # try a broader commercial search term
            last_error = exc
            try:
                search = find_search_input(driver, timeout=3)
            except Exception:
                break
    if last_error:
        raise StudioMusicError(f"Commercial music selection failed: {last_error}")
    raise StudioMusicError("Commercial music selection failed")


def find_caption_editor(driver, timeout: float = 60):
    deadline = time.time() + timeout
    while time.time() < deadline:
        driver.switch_to.default_content()
        try:
            textareas = [e for e in driver.find_elements("css selector", "textarea") if e.is_displayed() and e.is_enabled()]
            if textareas:
                return textareas[0]
            editables = [e for e in driver.find_elements("css selector", '[contenteditable="true"]') if e.is_displayed() and e.is_enabled()]
            if editables:
                # The caption editor is normally the largest visible editable
                # region on the post page.
                editables.sort(
                    key=lambda e: (e.size.get("width", 0) * e.size.get("height", 0)),
                    reverse=True,
                )
                return editables[0]
        except WebDriverException:
            pass
        time.sleep(0.5)
    raise StudioMusicError("TikTok caption editor was not found after saving the music edit")


def set_caption(driver, caption: str) -> None:
    editor = find_caption_editor(driver)
    editor.click()
    modifier = Keys.COMMAND if sys.platform == "darwin" else Keys.CONTROL
    editor.send_keys(modifier, "a")
    editor.send_keys(caption)


def click_enabled_post(driver, timeout: float = 180) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        driver.switch_to.default_content()
        try:
            buttons = driver.find_elements("css selector", 'button,[role="button"]')
            for button in buttons:
                if not button.is_displayed() or not button.is_enabled():
                    continue
                text = _normalize(button.text).lower()
                if text in {"post", "post now", "publish"}:
                    button.click()
                    return
        except WebDriverException:
            pass
        time.sleep(1)
    raise StudioMusicError("TikTok Post button never became available")


def wait_for_publish_confirmation(driver, timeout: float = 120) -> None:
    deadline = time.time() + timeout
    success_phrases = (
        "your video is being uploaded",
        "video is being uploaded",
        "video uploaded",
        "post published",
        "published successfully",
        "your post is being processed",
    )
    while time.time() < deadline:
        text = page_text(driver).lower()
        url = (driver.current_url or "").lower()
        if any(phrase in text for phrase in success_phrases):
            return
        if "/tiktokstudio/upload" not in url and "/editor" not in url and "tiktokstudio" in url:
            return
        # Some confirmations are modals with a second Post/Confirm action.
        if "confirm" in text and ("post" in text or "publish" in text):
            click_text(driver, ["Confirm", "Post", "Publish"], timeout=1, exact=True)
        time.sleep(1)
    raise StudioMusicError(
        "The Post action was sent, but TikTok did not provide a reliable publication confirmation"
    )


def safe_screenshot(driver, log_dir: Path) -> Path | None:
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
        path = log_dir / f"music-browser-error-{datetime.now().strftime('%Y%m%d-%H%M%S')}.png"
        driver.save_screenshot(str(path))
        return path
    except Exception:
        return None


def publish_with_commercial_music(
    account: str,
    vendor: Path,
    video: Path,
    caption: str,
    music_query: str,
    headless: bool = True,
    require_commercial: bool = True,
) -> str:
    if not video.exists():
        raise StudioMusicError(f"Video no longer exists: {video}")
    cookies = load_session_cookies(cookie_path(vendor, account))
    driver = None
    try:
        driver = build_driver(headless=headless)
        inject_cookies(driver, cookies)
        driver.get(STUDIO_UPLOAD_URL)
        time.sleep(2)

        body = page_text(driver).lower()
        if "log in" in body and "upload" not in body:
            raise StudioMusicError("TikTok browser session expired; import fresh TikTok cookies")

        file_input = find_visible_file_input(driver)
        file_input.send_keys(str(video.resolve()))

        selected = select_commercial_music(driver, music_query, require_commercial=require_commercial)
        set_caption(driver, caption)
        click_enabled_post(driver)
        wait_for_publish_confirmation(driver)

        print(f"MUSIC_SELECTED: {_normalize(selected)}")
        print("Published successfully")
        return selected
    except Exception:
        if driver is not None:
            shot = safe_screenshot(driver, ROOT / "logs")
            if shot:
                print(f"TikTok Studio diagnostic screenshot: {shot}", file=sys.stderr)
        raise
    finally:
        if driver is not None:
            try:
                driver.quit()
            except Exception:
                pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Publish a TikTok video with a native Commercial Sound")
    parser.add_argument("--user", required=True)
    parser.add_argument("--vendor", required=True)
    parser.add_argument("--video", required=True)
    parser.add_argument("--caption", required=True)
    parser.add_argument("--music-query", required=True)
    parser.add_argument("--headed", action="store_true", help="Show Chrome for diagnostics")
    args = parser.parse_args()

    headless = not args.headed and _truthy(os.getenv("AMB_TIKTOK_BROWSER_HEADLESS"), default=True)
    require_commercial = _truthy(os.getenv("AMB_TIKTOK_REQUIRE_COMMERCIAL_MUSIC"), default=True)
    try:
        publish_with_commercial_music(
            account=args.user,
            vendor=Path(args.vendor).expanduser().resolve(),
            video=Path(args.video).expanduser().resolve(),
            caption=args.caption,
            music_query=args.music_query,
            headless=headless,
            require_commercial=require_commercial,
        )
        return 0
    except Exception as exc:
        message = re.sub(r"\s+", " ", str(exc)).strip()
        print(f"ERROR: {message}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
