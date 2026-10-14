import base64

import pytest

from data_collector import storage
from data_collector.wikipedia_client import (
    PageNotFoundError,
    fetch_page_wikitext,
    fetch_page_categories_and_image_url,
    fetch_and_store_page,
)

# The standard 1x1 transparent PNG, used wherever a test needs real-but-tiny image
# bytes without hitting the network.
TINY_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


class _FakeResponse:
    def __init__(self, payload=None, content=b""):
        self._payload = payload
        self.content = content

    def json(self):
        return self._payload

    def raise_for_status(self):
        pass


class FakeSession:
    """Stands in for requests.Session in tests -- no real network call is made."""

    def __init__(
        self,
        wikitext_by_title,
        categories_by_title,
        redirect_map=None,
        image_url_by_title=None,
        image_bytes_by_url=None,
    ):
        self.wikitext_by_title = wikitext_by_title
        self.categories_by_title = categories_by_title
        self.redirect_map = redirect_map or {}
        self.image_url_by_title = image_url_by_title or {}
        self.image_bytes_by_url = image_bytes_by_url or {}
        self.get_calls = []

    def get(self, url, params=None, timeout=None):
        self.get_calls.append(params)
        if params is None:
            # A raw image download: no API params, just a GET to the image's own URL.
            return _FakeResponse(content=self.image_bytes_by_url[url])
        title = params["page"] if "page" in params else params["titles"]
        resolved = self.redirect_map.get(title, title)
        if params.get("action") == "parse":
            return _FakeResponse(
                {"parse": {"title": resolved, "wikitext": {"*": self.wikitext_by_title[resolved]}}}
            )
        if params.get("action") == "query":
            cats = self.categories_by_title.get(resolved, [])
            page = {"title": resolved, "categories": [{"title": c} for c in cats]}
            image_url = self.image_url_by_title.get(resolved)
            if image_url:
                page["original"] = {"source": image_url}
            return _FakeResponse({"query": {"pages": {"1": page}}})
        raise AssertionError(f"unexpected action in params: {params}")


def test_fetch_page_wikitext_returns_resolved_title_and_text():
    session = FakeSession(
        wikitext_by_title={"Cessna 172": "{{Infobox aircraft}}"},
        categories_by_title={},
    )
    resolved_title, wikitext = fetch_page_wikitext("Cessna 172", session)
    assert resolved_title == "Cessna 172"
    assert wikitext == "{{Infobox aircraft}}"


def test_fetch_page_wikitext_raises_page_not_found_on_api_error():
    """Real bug: index entries can be red links (bulleted on a "List of aircraft"
    page but never given their own article). The MediaWiki API answers those with an
    `error` payload, not a 4xx/5xx -- previously this fell through to a bare
    KeyError('parse') that crashed the whole classify-visible batch in the TUI."""

    class _MissingTitleResponse:
        def json(self):
            return {"error": {"code": "missingtitle", "info": "The page you specified doesn't exist."}}

    class _MissingTitleSession:
        def get(self, url, params=None, timeout=None):
            return _MissingTitleResponse()

    with pytest.raises(PageNotFoundError):
        fetch_page_wikitext("1911 Oertz monoplane", _MissingTitleSession())


def test_fetch_page_wikitext_follows_redirect():
    session = FakeSession(
        wikitext_by_title={
            "General Dynamics F-16 Fighting Falcon": "{{Infobox aircraft}}"
        },
        categories_by_title={},
        redirect_map={"F-16 Fighting Falcon": "General Dynamics F-16 Fighting Falcon"},
    )
    resolved_title, wikitext = fetch_page_wikitext("F-16 Fighting Falcon", session)
    assert resolved_title == "General Dynamics F-16 Fighting Falcon"


def test_fetch_page_categories_and_image_url_returns_categories_and_none():
    session = FakeSession(
        wikitext_by_title={},
        categories_by_title={"Cessna 172": ["Category:High-wing aircraft"]},
    )
    categories, image_url = fetch_page_categories_and_image_url("Cessna 172", session)
    assert categories == ["Category:High-wing aircraft"]
    assert image_url is None
    assert len(session.get_calls) == 1  # categories + image URL in one request


def test_fetch_page_categories_and_image_url_returns_the_image_url_when_present():
    session = FakeSession(
        wikitext_by_title={},
        categories_by_title={"Cessna 172": ["Category:High-wing aircraft"]},
        image_url_by_title={"Cessna 172": "https://upload.wikimedia.org/cessna.jpg"},
    )
    categories, image_url = fetch_page_categories_and_image_url("Cessna 172", session)
    assert categories == ["Category:High-wing aircraft"]
    assert image_url == "https://upload.wikimedia.org/cessna.jpg"
    assert len(session.get_calls) == 1


def test_fetch_and_store_page_persists_raw_page(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    session = FakeSession(
        wikitext_by_title={"Cessna 172": "{{Infobox aircraft}}"},
        categories_by_title={"Cessna 172": ["Category:High-wing aircraft"]},
    )
    raw_page = fetch_and_store_page(
        "Cessna 172", conn, session, images_dir=tmp_path / "images"
    )
    assert raw_page.resolved_title == "Cessna 172"
    assert storage.get_raw_page_by_resolved_title(conn, "Cessna 172") is not None


def test_fetch_and_store_page_is_idempotent_without_force(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    session = FakeSession(
        wikitext_by_title={"Cessna 172": "{{Infobox aircraft}}"},
        categories_by_title={"Cessna 172": []},
    )
    images_dir = tmp_path / "images"
    fetch_and_store_page("Cessna 172", conn, session, images_dir=images_dir)
    assert len(session.get_calls) == 2  # one parse call + one combined query call

    fetch_and_store_page("Cessna 172", conn, session, force=False, images_dir=images_dir)
    assert len(session.get_calls) == 2  # no new network calls made


def test_fetch_and_store_page_refetches_when_forced(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    session = FakeSession(
        wikitext_by_title={"Cessna 172": "{{Infobox aircraft}}"},
        categories_by_title={"Cessna 172": []},
    )
    images_dir = tmp_path / "images"
    fetch_and_store_page("Cessna 172", conn, session, images_dir=images_dir)
    fetch_and_store_page("Cessna 172", conn, session, force=True, images_dir=images_dir)
    assert len(session.get_calls) == 4


def test_fetch_and_store_page_saves_base64_and_a_real_image_file(tmp_path):
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    images_dir = tmp_path / "images"
    session = FakeSession(
        wikitext_by_title={"Cessna 172": "{{Infobox aircraft}}"},
        categories_by_title={"Cessna 172": []},
        image_url_by_title={"Cessna 172": "https://upload.wikimedia.org/cessna.png"},
        image_bytes_by_url={"https://upload.wikimedia.org/cessna.png": TINY_PNG_BYTES},
    )

    raw_page = fetch_and_store_page("Cessna 172", conn, session, images_dir=images_dir)

    assert raw_page.image_base64.startswith("data:image/png;base64,")
    assert raw_page.image_path == "images/cessna-172.png"
    written_file = images_dir / "cessna-172.png"
    assert written_file.read_bytes() == TINY_PNG_BYTES


def test_fetch_and_store_page_handles_a_page_with_no_image(tmp_path):
    """A missing image must not raise or block the fetch -- it's a warning signal for
    the caller (run_fetch_stage), not an error."""
    conn = storage.get_connection(tmp_path / "pipeline.sqlite3")
    images_dir = tmp_path / "images"
    session = FakeSession(
        wikitext_by_title={"Cessna 172": "{{Infobox aircraft}}"},
        categories_by_title={"Cessna 172": []},
    )

    raw_page = fetch_and_store_page("Cessna 172", conn, session, images_dir=images_dir)

    assert raw_page.image_base64 is None
    assert raw_page.image_path is None
    assert not images_dir.exists()
