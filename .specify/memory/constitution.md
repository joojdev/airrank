<!--
Sync Impact Report
- Version change: 1.3.0 → 1.4.0 (MINOR: materially expanded Technology & Platform
  Constraints — sanctions `langchain` plus a swappable LLM provider (currently
  Google AI Studio's free tier, via `langchain-google-genai`) for the data
  collector's field-extraction step, replacing the previous regex/keyword-based
  extraction; no principle added, removed, or redefined)
- Modified principles: none (Technology & Platform Constraints' data collector
  paragraph extended with two sentences; Principle I unchanged — extraction
  correctness is now a model/prompt concern flagged via `needs_review`, not
  something `.feature` scenarios can pin deterministically against regex, so those
  scenarios now verify pipeline wiring against a scripted fake model instead of
  literal parsing of real wikitext, per the existing "supporting unit tests use
  pytest" / feature-level carve-out already in this section)
- Added sections: none
- Removed sections: none
- Follow-up TODOs: none

Prior syncs:
- 1.3.0: sanctions `textual` for the data collector's new interactive
  aircraft-selection TUI, used to search Wikipedia's aircraft index and curate
  targets.txt; no principle added, removed, or redefined
- 1.2.1: renamed the "crawler" component to "data collector" throughout — directory
  crawler/ -> data-collector/, Python package crawler -> data_collector —
  wording/reference change only, no principle added, removed, or redefined
- 1.2.0: materially expanded Technology & Platform Constraints — defines crawler
  execution model as manual/local/on-demand only, and establishes a committed static
  JSON file as the sole data store for this version, ruling out a live backend/API
- 1.1.0: extended Technology & Platform Constraints with concrete two-component
  architecture (frontend: TS/Vite/React/shadcn/Tailwind/Zustand/Playwright+Cucumber/
  Vitest; crawler: Python/Selenium/requests+BeautifulSoup/behave/pytest); Principle I
  extended to name the Gherkin runner for each component
- 1.0.0: initial ratification — Core Principles (I. Gherkin-First Red-Green
  Development, II. Simplicity & YAGNI, III. Accessible & Polished User Experience),
  Technology & Platform Constraints, Development Workflow, Governance
-->

# Airplane Guessing Game Constitution

## Core Principles

### I. Gherkin-First, Red-Green Development (NON-NEGOTIABLE)
Every new feature, game rule, or bug fix MUST begin as a Gherkin spec (Given/When/Then
`.feature` file) describing the observable behavior before any implementation or step
code is written. No exceptions: if there is no `.feature` scenario for a behavior, that
behavior MUST NOT be built. The cycle is strictly: write/extend the Gherkin scenario →
wire up (or write) the step definitions so the scenario runs and fails (RED) → write the
minimum implementation to make it pass (GREEN) → refactor while keeping it green. Agents
and contributors MUST follow this red-green cycle explicitly grounded in the Gherkin
specs — implementation code MUST NOT be written before a corresponding scenario exists
and has been observed failing. Game logic (round scoring, guess validation, answer
matching) and user-facing flows (start a round, submit a guess, see the result) all
require Gherkin scenarios; unit-level details not worth expressing as Given/When/Then
may still need supporting unit tests, but the feature-level behavior contract is always
Gherkin first. This applies identically to both project components: the frontend runs
its `.feature` scenarios through Playwright + Cucumber, and the data collector runs its
`.feature` scenarios through `behave`; neither component may add code without a scenario
in its respective suite going RED first.
Rationale: A guessing game lives or dies on correct scoring and fair round logic;
regressions here directly break the player's trust in the game's fairness. Expressing
behavior as Gherkin first keeps specs readable as living documentation and forces every
change to prove itself against an explicit, human-readable contract before code exists;
the red-green discipline prevents tests from silently passing without ever having
exercised the new behavior.

### II. Simplicity & YAGNI
Build the smallest thing that satisfies the current, stated requirement. Do not add
configuration options, abstraction layers, game modes, or dependencies for hypothetical
future needs. Prefer plain, well-named functions and data over frameworks-within-the-
framework. If a simpler implementation exists that meets the same requirement with less
code or fewer moving parts, it MUST be preferred, even if a more "extensible" version
was already partly built.
Rationale: This is a browser game, not a platform. Speculative abstraction slows down
the small number of features that actually matter (correctly showing an airplane,
correctly checking a guess) and makes the codebase harder to reason about for no
current benefit.

### III. Accessible & Polished User Experience
Every player-facing screen and interaction MUST be usable via keyboard alone and MUST
expose meaningful text alternatives for non-text content (e.g., airplane images/photos
used as guessing prompts require descriptive alt text that does not give away the
answer). Feedback for a guess (correct, incorrect, round over, score change) MUST be
communicated through more than color alone (e.g., icon/text + color) and MUST be
announced in a way compatible with screen readers (e.g., ARIA live regions for dynamic
result text). Visual and interaction polish (loading states, disabled states, clear
call-to-action for "next round") is a requirement of "done," not a nice-to-have added
later.
Rationale: A guessing game is fundamentally an interactive UI product; if the core loop
(see prompt → guess → get feedback) isn't accessible and clear, the product fails its
only purpose regardless of how correct the underlying logic is.

## Technology & Platform Constraints

The project has exactly two components, each with a fixed, non-negotiable stack:

- **Frontend** (browser game): TypeScript + Vite + React + shadcn/ui, styled with
  Tailwind CSS. Application/game state (current round, score, guess history) MUST be
  managed with Zustand rather than ad-hoc prop-drilling or a heavier state library.
  Feature-level behavior is verified with Playwright driven by Cucumber (Gherkin
  `.feature` files); pure-logic units (scoring, guess matching) additionally get Vitest
  unit tests. The frontend MUST run in a standard modern browser without requiring a
  native app install.
- **Data collector** (airplane reference data collection): Python, using Selenium for
  pages that require JavaScript rendering/interaction and `requests`/`httpx` +
  BeautifulSoup for plain HTML fetch-and-parse targets — Selenium is reserved for pages
  that actually need a browser; simpler pages MUST use the lighter HTTP+parser path.
  Feature-level data collector behavior (e.g., "given an aircraft listing page, extract
  name, specs, and image URL") is verified with `behave` Gherkin `.feature` files;
  supporting unit tests use `pytest`. For the interactive aircraft-selection tool used
  to curate `targets.txt`, the data collector MAY additionally use `textual` (a
  terminal UI framework) to provide a searchable, keyboard-driven picker over
  Wikipedia's aircraft index; this is the only sanctioned TUI/interactive-terminal
  library for this component, and it MUST NOT be used to build a persistent or
  networked service, consistent with the "run manually/on-demand, locally" constraint
  below. Field extraction from a fetched page's raw content (name, specs, category
  interpretation) MAY use `langchain` bound to an LLM provider rather than
  bespoke regex/keyword matching, since Wikipedia's actual wikitext formatting is too
  varied for any fixed set of patterns to keep up with. Code MUST depend only on
  `langchain_core.language_models.BaseChatModel`, never a concrete provider class, so
  the provider is swappable without touching extraction logic; the concrete provider
  choice lives in exactly one function. Any numeric unit conversion the model needs
  MUST be exposed to it as a callable tool backed by exact arithmetic, never left to
  the model's own computation. Provider credentials MUST come from an environment
  variable, never be hardcoded or committed.

For this version, the data collector is NOT a running service: it MUST be run
manually/on-demand, locally, whenever the airplane data needs to be (re)collected — no
scheduler, cron job, or deployed data-collector process. Its output MUST be a static
JSON file committed to the GitHub repository, which acts as the application's sole data
store ("fake database") for this version; there MUST NOT be a live backend/API serving
airplane data. The frontend MUST read this committed JSON directly (bundled at build
time or fetched as a static asset) rather than expecting any server to generate or
transform it at runtime. The JSON's shape MUST be explicit and documented, and MUST NOT
leak the correct answer to the client in a way that trivially defeats the guessing
mechanic (e.g., a field the player can inspect before guessing that reveals the
answer). Airplane reference data (names, images, specs) produced by the data collector
SHOULD be treated as the single, identifiable source of truth so that facts shown to
players are internally consistent.

## Development Workflow

All changes proceed through: Gherkin scenario (Given/When/Then) written or extended →
scenario observed RED (failing/undefined steps) → minimum implementation to go GREEN →
refactor → review. Pull requests MUST link to or include the `.feature` scenario(s)
covering the change and state how test coverage and accessibility were addressed for
any user-facing change. Reviewers MUST reject PRs that introduce game logic without a
preceding Gherkin scenario, that skip the observed-RED step, that add unnecessary
abstraction/config beyond the stated requirement, or that ship UI that is not
keyboard-operable/screen-reader-friendly.

## Governance

This constitution supersedes ad-hoc conventions for this project. Amendments require:
(1) a documented reason for the change, (2) an update to this file including the version
bump and Sync Impact Report, and (3) review of any dependent templates or workflow docs
that reference the amended principle so they are not left inconsistent.

Versioning policy (semantic versioning applied to governance):
- MAJOR: Backward-incompatible removal or redefinition of a principle.
- MINOR: A new principle or materially expanded section is added.
- PATCH: Wording, clarification, or typo fixes with no semantic change.

All PRs and code reviews MUST verify compliance with this constitution. Any deviation
(e.g., merging untested logic under time pressure) MUST be called out explicitly in the
PR description with a justification; unjustified complexity or skipped tests are
grounds for requesting changes.

**Version**: 1.4.0 | **Ratified**: 2026-08-08 | **Last Amended**: 2026-08-11
