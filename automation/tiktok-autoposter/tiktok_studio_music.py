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

from selenium import webdriver
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys

ROOT = Path(__file__).resolve().parent
STUDIO_UPLOAD_URL = "https://www.tiktok.com/tiktokstudio/upload?from=creator_center"
TIKTOK_HOME = "https://www.tiktok.com/"

COMMERCIAL_LABELS = (
    "Commercial Sounds",
    "Commercial Sound",
    "Commercial Music",
    "Commercial Music Library",
)


class StudioMusicError(RuntimeError):
    pass


def _truthy(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _normalize(text: str) -> str:
    return " ".join((text or "").split()).strip()


def commercial_context_visible(text: str) -> bool:
    normalized = _normalize(text).lower()
    return any(label.lower() in normalized for label in COMMERCIAL_LABELS)


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

    names = {cookie["name"] for cookie in cookies}
    if "sessionid" not in names:
        raise StudioMusicError("TikTok session is missing sessionid; import fresh TikTok cookies")
    return cookies


def build_driver(headless: bool):
    options = Options()
    options.add_argument("--window-size=1440,1200")
    options.add_argument("--lang=en-US")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")
    options.add_experimental_option("prefs", {"intl.accept_languages": "en-US,en"})
    if headless:
        options.add_argument("--headless=new")

    try:
        # Standard Selenium/Chrome only. No stealth, anti-bot, CAPTCHA, or
        # verification bypass is attempted. Selenium Manager resolves the
        # compatible driver when needed.
        return webdriver.Chrome(options=options)
    except WebDriverException as exc:
        raise StudioMusicError(
            "A compatible Google Chrome/ChromeDriver could not be started. "
            "Install/update Google Chrome and try again."
        ) from exc


def inject_cookies(driver, cookies: Iterable[dict]) -> None:
    driver.get(TIKTOK_HOME)
    time.sleep(1)
    accepted = 0
    for cookie in cookies:
        try:
            driver.add_cookie(cookie)
            accepted += 1
        except WebDriverException:
            # Browser exports may include host-specific cookies Chrome rejects
            # on www.tiktok.com. Each cookie is attempted independently.
            continue
    if accepted == 0:
        raise StudioMusicError("Chrome rejected the imported TikTok session cookies")
    driver.get(TIKTOK_HOME)
    time.sleep(1)


def page_text(driver) -> str:
    try:
        return _normalize(
            driver.execute_script("return document.body ? document.body.innerText : ''") or ""
        )
    except WebDriverException:
        return ""


def click_text(
    driver,
    labels: Iterable[str],
    timeout: float = 20,
    exact: bool = True,
) -> str | None:
    wanted = [_normalize(label).lower() for label in labels if _normalize(label)]
    deadline = time.time() + timeout
    script = r"""
const labels = arguments[0];
const exact = arguments[1];
const nodes = Array.from(document.querySelectorAll(
  'button,[role="button"],a,[role="tab"],span,div'
));
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
            result = driver.execute_script(script, wanted, exact)
            if result:
                return str(result)
        except WebDriverException:
            pass
        time.sleep(0.5)
    return None


def find_file_input(driver, timeout: float = 90):
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


def wait_for_upload_editor(driver, timeout: float = 240) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        text = page_text(driver).lower()
        if "upload" not in text and "log in" in text:
            raise StudioMusicError("TikTok browser session expired; import fresh TikTok cookies")

        if click_text(
            driver,
            ["Edit video", "Edit video in Studio"],
            timeout=1,
            exact=True,
        ):
            time.sleep(3)
            return

        if click_text(
            driver,
            ["Add sound", "Add music"],
            timeout=1,
            exact=True,
        ):
            time.sleep(2)
            return
        time.sleep(1)

    raise StudioMusicError(
        "TikTok received the video but the video/audio editor did not become available"
    )


def open_music_library(driver) -> None:
    # Depending on TikTok Studio version, the editor either opens directly on
    # a sound panel or exposes Audio -> Music / Add sound.
    if commercial_context_visible(page_text(driver)):
        return

    audio_clicked = click_text(
        driver,
        ["Audio", "Add sound", "Add music", "Sound", "Sounds"],
        timeout=15,
        exact=True,
    )
    if audio_clicked:
        time.sleep(1)

    if commercial_context_visible(page_text(driver)):
        return

    music_clicked = click_text(
        driver,
        ["Music", "Sounds", "Sound"],
        timeout=12,
        exact=True,
    )
    if music_clicked:
        time.sleep(1)


def enter_commercial_library(driver, require_commercial: bool) -> None:
    if commercial_context_visible(page_text(driver)):
        return

    clicked = click_text(driver, COMMERCIAL_LABELS, timeout=12, exact=True)
    if clicked:
        time.sleep(1)

    if require_commercial and not commercial_context_visible(page_text(driver)):
        raise StudioMusicError(
            "TikTok did not confirm a Commercial Sounds context; "
            "refusing to select music from the unrestricted library"
        )


def find_search_input(driver, timeout: float = 25):
    deadline = time.time() + timeout
    while time.time() < deadline:
        driver.switch_to.default_content()
        try:
            ranked = []
            for element in driver.find_elements("css selector", "input"):
                if not element.is_displayed() or not element.is_enabled():
                    continue
                placeholder = (element.get_attribute("placeholder") or "").lower()
                aria = (element.get_attribute("aria-label") or "").lower()
                text = f"{placeholder} {aria}"
                score = 0
                if "search" in text:
                    score += 5
                if "music" in text or "sound" in text:
                    score += 3
                ranked.append((score, element))
            ranked.sort(key=lambda pair: pair[0], reverse=True)
            if ranked and ranked[0][0] > 0:
                return ranked[0][1]
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


def first_use_button_and_card(driver, timeout: float = 25):
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
  if (!['use', 'add', 'select'].includes(t)) continue;
  let node = el;
  let best = '';
  for (let i = 0; i < 6 && node; i++, node = node.parentElement) {
    const text = (node.innerText || '').replace(/\s+/g, ' ').trim();
    if (text.length >= 8 && text.length <= 500) best = text;
  }
  el.setAttribute('data-amb-music-choice', '1');
  return best || 'Commercial Sound';
}
return null;
"""
    while time.time() < deadline:
        driver.switch_to.default_content()
        try:
            card_text = driver.execute_script(script)
            if card_text:
                element = driver.find_element(
                    "css selector", '[data-amb-music-choice="1"]'
                )
                return element, _normalize(str(card_text))[:400]
        except WebDriverException:
            pass
        time.sleep(0.5)
    raise StudioMusicError("No usable Commercial Sound result was found")


def save_music_edit(driver, timeout: float = 30) -> None:
    saved = click_text(
        driver,
        ["Save edits", "Save", "Apply", "Done"],
        timeout=timeout,
        exact=True,
    )
    if not saved:
        raise StudioMusicError(
            "A Commercial Sound was selected, but TikTok did not confirm/save the audio edit"
        )
    time.sleep(3)


def select_commercial_music(
    driver,
    query: str,
    require_commercial: bool = True,
) -> str:
    wait_for_upload_editor(driver)
    open_music_library(driver)
    enter_commercial_library(driver, require_commercial=require_commercial)

    search_terms = list(
        dict.fromkeys(
            term for term in (
                _normalize(query),
                "fashion",
                "upbeat fashion",
            )
            if term
        )
    )
    last_error: Exception | None = None

    for term in search_terms:
        try:
            if require_commercial and not commercial_context_visible(page_text(driver)):
                enter_commercial_library(driver, require_commercial=True)

            search = find_search_input(driver)
            clear_and_type(search, term)
            time.sleep(2)
            choice, card_text = first_use_button_and_card(driver, timeout=15)
            choice.click()
            time.sleep(2)
            save_music_edit(driver)
            return card_text
        except Exception as exc:
            last_error = exc
            time.sleep(1)

    if last_error:
        raise StudioMusicError(f"Commercial music selection failed: {last_error}")
    raise StudioMusicError("Commercial music selection failed")


def find_caption_editor(driver, timeout: float = 75):
    deadline = time.time() + timeout
    while time.time() < deadline:
        driver.switch_to.default_content()
        try:
            candidates = []
            for selector in ("textarea", '[contenteditable="true"]'):
                for element in driver.find_elements("css selector", selector):
                    if not element.is_displayed() or not element.is_enabled():
                        continue
                    placeholder = (
                        (element.get_attribute("placeholder") or "")
                        + " "
                        + (element.get_attribute("aria-label") or "")
                    ).lower()
                    area = element.size.get("width", 0) * element.size.get("height", 0)
                    score = area
                    if any(word in placeholder for word in ("caption", "description", "describe")):
                        score += 1_000_000
                    candidates.append((score, element))
            if candidates:
                candidates.sort(key=lambda pair: pair[0], reverse=True)
                return candidates[0][1]
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
            for button in driver.find_elements("css selector", 'button,[role="button"]'):
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
        "your video has been posted",
    )

    while time.time() < deadline:
        text = page_text(driver).lower()
        url = (driver.current_url or "").lower()
        if any(phrase in text for phrase in success_phrases):
            return

        # TikTok Studio commonly returns to another Studio page only after a
        # successful post submission. A non-Studio redirect is not accepted.
        if (
            "tiktokstudio" in url
            and "/tiktokstudio/upload" not in url
            and "/editor" not in url
        ):
            return

        if "confirm" in text and ("post" in text or "publish" in text):
            click_text(
                driver,
                ["Confirm", "Post", "Publish"],
                timeout=1,
                exact=True,
            )
        time.sleep(1)

    raise StudioMusicError(
        "The Post action was sent, but TikTok did not provide a reliable publication confirmation"
    )


def safe_screenshot(driver, log_dir: Path) -> Path | None:
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
        path = log_dir / (
            "music-browser-error-"
            + datetime.now().strftime("%Y%m%d-%H%M%S")
            + ".png"
        )
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
            raise StudioMusicError(
                "TikTok browser session expired; import fresh TikTok cookies"
            )

        file_input = find_file_input(driver)
        file_input.send_keys(str(video.resolve()))

        selected = select_commercial_music(
            driver,
            music_query,
            require_commercial=require_commercial,
        )
        set_caption(driver, caption)
        click_enabled_post(driver)
        wait_for_publish_confirmation(driver)

        print(f"MUSIC_SELECTED: {_normalize(selected)}")
        print("Published successfully")
        return selected
    except Exception:
        if driver is not None:
            screenshot = safe_screenshot(driver, ROOT / "logs")
            if screenshot:
                print(
                    f"TikTok Studio diagnostic screenshot: {screenshot}",
                    file=sys.stderr,
                )
        raise
    finally:
        if driver is not None:
            try:
                driver.quit()
            except Exception:
                pass


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Publish a TikTok video with a native Commercial Sound"
    )
    parser.add_argument("--user", required=True)
    parser.add_argument("--vendor", required=True)
    parser.add_argument("--video", required=True)
    parser.add_argument("--caption", required=True)
    parser.add_argument("--music-query", required=True)
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Show the standard Chrome window for diagnostics",
    )
    args = parser.parse_args()

    headless = not args.headed and _truthy(
        os.getenv("AMB_TIKTOK_BROWSER_HEADLESS"),
        default=True,
    )
    require_commercial = _truthy(
        os.getenv("AMB_TIKTOK_REQUIRE_COMMERCIAL_MUSIC"),
        default=True,
    )

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
