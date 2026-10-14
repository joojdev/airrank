"""The one place a concrete LLM provider is named. Everything else in the pipeline
depends only on `langchain_core.language_models.BaseChatModel` -- swapping providers
means editing this one module, not touching pipeline.py/discovery.py/tui code.

Which provider `build_default_llm()` returns is picked at runtime by the
`LLM_PROVIDER` environment variable (`google` or `azure`, default `google` -- unset
`LLM_PROVIDER` keeps existing setups working unchanged), loaded from
`data-collector/.env` if present. `.env` is git-ignored at the repo root; it never
gets committed, and neither module hardcodes a key.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.language_models import BaseChatModel

_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"

# An alias, not a pinned version number -- deliberate: a pinned model (e.g.
# gemini-2.5-flash, this plan's original target) can get deprecated out from under new
# API keys with no warning (verified live: gemini-2.5-flash returned 404 "no longer
# available to new users" on a freshly created key). The alias is what would have
# avoided that.
#
# flash-*lite*, not plain flash: Google no longer publishes fixed free-tier RPM/TPM
# numbers per model (they're account-specific, shown only in each user's own AI Studio
# dashboard), but the lite tier is consistently the higher-throughput/lower-cost option
# across Gemini generations -- the right default for a pipeline that calls the model
# once per page, sequentially, for possibly dozens of pages in one run. Structured
# extraction with a handful of tools doesn't need flagship-tier reasoning. See
# `_invoke_with_retry` in llm_extraction.py for what happens on a 429 anyway.
_GOOGLE_MODEL = "gemini-flash-lite-latest"

# gpt-5.4-mini over gpt-5-nano: nano is cheaper still, but mini's stronger reasoning
# matters more here than the already-trivial cost difference (a few dollars for the
# whole dataset either way) -- this extraction task has to judge ambiguous,
# multi-variant pages (e.g. "Boeing 777" family articles) correctly, not just cheaply.
_AZURE_DEPLOYMENT = "gpt-5.4-mini"


def _build_google_llm() -> BaseChatModel:
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(model=_GOOGLE_MODEL, temperature=0)


def _build_azure_llm() -> BaseChatModel:
    from langchain_openai import AzureChatOpenAI

    # azure_deployment/api_version/azure_endpoint/api_key all read from their
    # matching AZURE_OPENAI_*/OPENAI_API_VERSION env vars when omitted, same
    # env-var-only credential rule as the Google path -- set AZURE_OPENAI_API_KEY,
    # AZURE_OPENAI_ENDPOINT, and OPENAI_API_VERSION in .env (see README).
    return AzureChatOpenAI(azure_deployment=_AZURE_DEPLOYMENT, temperature=0)


def build_default_llm() -> BaseChatModel:
    # Doesn't override an already-exported env var (e.g. set in the shell) -- .env is
    # just a fallback for local convenience, per load_dotenv's own default
    # (override=False).
    load_dotenv(_ENV_FILE)

    provider = os.environ.get("LLM_PROVIDER", "google").strip().lower()
    if provider == "azure":
        return _build_azure_llm()
    if provider == "google":
        return _build_google_llm()
    raise ValueError(f"Unknown LLM_PROVIDER {provider!r} (expected 'google' or 'azure')")
