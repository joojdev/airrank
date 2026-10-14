import base64
from pathlib import Path

from behave import given, when, then

from data_collector import storage
from data_collector.wikipedia_client import fetch_and_store_page

FIXTURES = Path(__file__).resolve().parents[2] / "tests" / "fixtures"

# The standard 1x1 transparent PNG -- real-but-tiny image bytes without the network.
TINY_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)
TINY_PNG_URL = "https://upload.wikimedia.org/cessna.png"


class _FakeResponse:
    def __init__(self, payload=None, content=b""):
        self._payload = payload
        self.content = content

    def json(self):
        return self._payload


class _FakeSession:
    def __init__(self, wikitext_by_title, categories_by_title, redirect_map, image_url_by_title=None):
        self.wikitext_by_title = wikitext_by_title
        self.categories_by_title = categories_by_title
        self.redirect_map = redirect_map
        self.image_url_by_title = image_url_by_title or {}
        self.get_calls = []

    def get(self, url, params=None, timeout=None):
        self.get_calls.append(params)
        if params is None:
            # A raw image download: no API params, just a GET to the image's own URL.
            return _FakeResponse(content=TINY_PNG_BYTES)
        title = params.get("page") or params.get("titles")
        resolved = self.redirect_map.get(title, title)
        if params.get("action") == "parse":
            return _FakeResponse(
                {
                    "parse": {
                        "title": resolved,
                        "wikitext": {"*": self.wikitext_by_title[resolved]},
                    }
                }
            )
        cats = self.categories_by_title.get(resolved, [])
        page = {"title": resolved, "categories": [{"title": c} for c in cats]}
        image_url = self.image_url_by_title.get(resolved)
        if image_url:
            page["original"] = {"source": image_url}
        return _FakeResponse({"query": {"pages": {"1": page}}})


@given('the Wikipedia title "{title}" redirects to "{resolved_title}"')
def step_impl(context, title, resolved_title):
    wikitext = (FIXTURES / "f16_wikitext.txt").read_text()
    import json

    categories = json.loads((FIXTURES / "f16_categories.json").read_text())
    context.session = _FakeSession(
        wikitext_by_title={resolved_title: wikitext},
        categories_by_title={resolved_title: categories},
        redirect_map={title: resolved_title},
    )
    context.requested_title = title


@given('"{title}" has already been fetched and stored in raw_pages')
def step_impl(context, title):
    context.session = _FakeSession(
        wikitext_by_title={title: "{{Infobox aircraft}}"},
        categories_by_title={title: []},
        redirect_map={},
    )
    context.requested_title = title
    conn = storage.get_connection(context.db_path)
    fetch_and_store_page(title, conn, context.session, images_dir=context.tmp_dir / "images")
    conn.close()


@given('the Wikipedia title "{title}" has a fetchable infobox image')
def step_impl(context, title):
    context.session = _FakeSession(
        wikitext_by_title={title: "{{Infobox aircraft}}"},
        categories_by_title={title: []},
        redirect_map={},
        image_url_by_title={title: TINY_PNG_URL},
    )
    context.requested_title = title


@given('the Wikipedia title "{title}" has no infobox image')
def step_impl(context, title):
    context.session = _FakeSession(
        wikitext_by_title={title: "{{Infobox aircraft}}"},
        categories_by_title={title: []},
        redirect_map={},
    )
    context.requested_title = title


@when('stage 1 fetches "{title}"')
def step_impl(context, title):
    context.conn = storage.get_connection(context.db_path)
    context.raw_page = fetch_and_store_page(
        title, context.conn, context.session, images_dir=context.tmp_dir / "images"
    )


@when('stage 1 fetches "{title}" again without forcing a refresh')
def step_impl(context, title):
    context.conn = storage.get_connection(context.db_path)
    context.calls_before = len(context.session.get_calls)
    context.raw_page = fetch_and_store_page(
        title,
        context.conn,
        context.session,
        force=False,
        images_dir=context.tmp_dir / "images",
    )


@then('a row exists in raw_pages with resolved_title "{resolved_title}"')
def step_impl(context, resolved_title):
    stored = storage.get_raw_page_by_resolved_title(context.conn, resolved_title)
    assert stored is not None, f"no raw_pages row for {resolved_title}"
    context.stored_page = stored


@then('its wikitext contains "{substring}"')
def step_impl(context, substring):
    assert substring in context.stored_page.wikitext


@then('its categories include "{category}"')
def step_impl(context, category):
    assert category in context.stored_page.categories


@then("no new HTTP request is made")
def step_impl(context):
    assert len(context.session.get_calls) == context.calls_before


@then("its image is stored as a base64 data URI")
def step_impl(context):
    assert context.raw_page.image_base64 is not None
    assert context.raw_page.image_base64.startswith("data:image/")


@then('a real image file was saved for "{title}"')
def step_impl(context, title):
    assert context.raw_page.image_path is not None
    image_file = context.tmp_dir / "images" / Path(context.raw_page.image_path).name
    assert image_file.exists()


@then('no image file was saved for "{title}"')
def step_impl(context, title):
    assert context.raw_page.image_path is None
