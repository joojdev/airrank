"""Stage 1: MediaWiki API calls only. Plain JSON over HTTP -- no Selenium, no HTML
parsing, per the constitution's "simpler pages MUST use the lighter HTTP+parser path"
rule. `session` is injected everywhere so tests never touch the real network."""

import base64
import mimetypes
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from data_collector import storage
from data_collector.models import RawPage
from data_collector.pipeline import slugify

API_URL = "https://en.wikipedia.org/w/api.php"
USER_AGENT = (
    "airplane-guessing-game-data-collector/0.1 "
    "(https://github.com/; local, on-demand, manual data collection for a hobby project)"
)

REPO_ROOT = Path(__file__).resolve().parents[2]
IMAGES_DIR = REPO_ROOT / "frontend" / "public" / "data" / "images"


class PageNotFoundError(Exception):
    """The MediaWiki API reported the requested title doesn't exist -- e.g. a red
    link bulleted on a "List of aircraft" index page that never got its own article,
    or a title that was since renamed/deleted. Distinct from a network/transport
    failure: this is Wikipedia's own answer, not an error talking to it."""


def _headers() -> dict[str, str]:
    return {"User-Agent": USER_AGENT}


def fetch_page_wikitext(title: str, session) -> tuple[str, str]:
    response = session.get(
        API_URL,
        params={
            "action": "parse",
            "page": title,
            "redirects": 1,
            "prop": "wikitext",
            "format": "json",
        },
        timeout=30,
    )
    data = response.json()
    if "error" in data:
        raise PageNotFoundError(
            f"{title}: {data['error'].get('info', data['error'].get('code'))}"
        )
    payload = data["parse"]
    return payload["title"], payload["wikitext"]["*"]


def fetch_page_categories_and_image_url(
    title: str, session
) -> tuple[list[str], Optional[str]]:
    """Categories and the page's lead/infobox image URL (via the `pageimages` prop),
    combined into one `action=query` call rather than a separate round-trip just for
    the image -- MediaWiki supports combining `prop` values in a single request."""
    response = session.get(
        API_URL,
        params={
            "action": "query",
            "titles": title,
            "redirects": 1,
            "prop": "categories|pageimages",
            "cllimit": 500,
            "piprop": "original",
            "format": "json",
        },
        timeout=30,
    )
    pages = response.json()["query"]["pages"]
    (page,) = pages.values()
    categories = [category["title"] for category in page.get("categories", [])]
    original = page.get("original")
    return categories, (original["source"] if original else None)


def _download_image_base64(image_url: str, session) -> str:
    image_response = session.get(image_url, timeout=30)
    mime_type = mimetypes.guess_type(image_url)[0] or "image/jpeg"
    encoded = base64.b64encode(image_response.content).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _save_image_file(
    resolved_title: str, image_data_uri: Optional[str], images_dir: Path
) -> Optional[str]:
    """Decodes a `data:<mime>;base64,<...>` URI into a real file under `images_dir`,
    returning the path the exported JSON should reference (relative to
    frontend/public/data/), or None if the page had no image."""
    if not image_data_uri:
        return None
    header, encoded = image_data_uri.split(",", 1)
    mime_type = header.removeprefix("data:").split(";")[0]
    ext = mimetypes.guess_extension(mime_type) or ".jpg"
    images_dir.mkdir(parents=True, exist_ok=True)
    (images_dir / f"{slugify(resolved_title)}{ext}").write_bytes(
        base64.b64decode(encoded)
    )
    return f"images/{slugify(resolved_title)}{ext}"


def fetch_and_store_page(
    title: str, conn, session, force: bool = False, images_dir: Path = IMAGES_DIR
) -> RawPage:
    if not force:
        existing = storage.get_raw_page_by_resolved_title(conn, title)
        if existing is not None:
            return existing

    resolved_title, wikitext = fetch_page_wikitext(title, session)
    categories, image_url = fetch_page_categories_and_image_url(title, session)
    image_base64 = _download_image_base64(image_url, session) if image_url else None
    image_path = _save_image_file(resolved_title, image_base64, images_dir)

    raw_page = RawPage(
        id=None,
        requested_title=title,
        resolved_title=resolved_title,
        wikitext=wikitext,
        categories=categories,
        fetched_at=datetime.now(timezone.utc).isoformat(),
        image_base64=image_base64,
        image_path=image_path,
    )
    storage.upsert_raw_page(conn, raw_page)
    return storage.get_raw_page_by_resolved_title(conn, resolved_title)
