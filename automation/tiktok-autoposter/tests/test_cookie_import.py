import importlib.util
import sys
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "import_cookies.py"
spec = importlib.util.spec_from_file_location("import_cookies", MODULE)
import_cookies = importlib.util.module_from_spec(spec)
sys.modules["import_cookies"] = import_cookies
assert spec.loader
spec.loader.exec_module(import_cookies)


def test_http_only_session_cookie_is_parsed(tmp_path):
    cookie_file = tmp_path / "cookies.txt"
    cookie_file.write_text(
        "# Netscape HTTP Cookie File\n"
        "#HttpOnly_.tiktok.com\tTRUE\t/\tTRUE\t1893456000\tsessionid\tsecret\n"
        ".tiktok.com\tTRUE\t/\tTRUE\t1893456000\ttt-target-idc\talisg\n",
        encoding="utf-8",
    )
    cookies = import_cookies.parse_netscape(cookie_file)
    names = {cookie["name"] for cookie in cookies}
    assert {"sessionid", "tt-target-idc"} <= names


def test_any_legitimate_tiktok_subdomain_is_allowed():
    assert import_cookies.is_tiktok_domain("tiktok.com")
    assert import_cookies.is_tiktok_domain(".tiktok.com")
    assert import_cookies.is_tiktok_domain("www.tiktok.com")
    assert import_cookies.is_tiktok_domain("ads.tiktok.com")
    assert not import_cookies.is_tiktok_domain("nottiktok.com")
    assert not import_cookies.is_tiktok_domain("tiktok.com.example.com")
