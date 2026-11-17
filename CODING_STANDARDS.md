# Coding Standards

Judgement calls and architectural rules enforced during code review.

## Layer Boundaries (ADR-0009)

- **Pure Core**: Code in `src/core/` must remain pure TypeScript with zero DOM or Chrome extension API dependencies (enforced at compile time via `tsconfig.core.json`).
- **Single Canonical Export**: Core utilities should export a single canonical form (either a pure function or a stateless class), avoiding redundant singleton instances or wrapper delegation functions.
- **Decoupled Adapters**: Platform DOM extraction (`PlatformAdapter`) and UI injection (`PlatformUI`) must remain decoupled interfaces (ADR-0006).
- **Account vs. Content Deletion**: Adapters must never classify a comment as deleted solely because its author handle is `[deleted]` or missing. Deleted state requires explicit comment deletion attributes (`deleted="true"`) or purged body content (`[deleted]`, `[removed]`).
- **Barrel Purity**: Entry-point scripts with runtime side-effects (such as content scripts or service workers) must not execute top-level actions when re-exported in layer barrel files (`index.ts`). Guard top-level execution behind environment checks or isolate entry points.
- **Accurate Pipeline Feedback**: In-page micro-feedback and user-facing count metrics must reflect the post-pipeline filtered thread document rather than raw pre-filter DOM node totals.
- **Pure Domain Traversals**: Recursive operations, aggregations, or queries over canonical Intermediate Representations (`ThreadDocument`, `CommentNode[]`) must be declared as pure functions in `src/core/` rather than re-implemented inside UI or platform adapters.
- **Token-Dense Frontmatter**: Serialized YAML frontmatter emitted for LLM consumption must emit optional metadata flags conditionally (omitting negative or default states) and avoid internal UI counters to maximize prompt token density.
- **DOM-Availability Extraction**: Platform adapters must extract currently hydrated DOM elements without speculating or asserting on unhydrated host SPA state (`isPartiallyLoaded`). Browser extensions should prioritize synchronous fidelity over host background hydration guesswork.

## Extension Architecture

- **Single Dispatch Channel for Commands**: When a browser action or shortcut is registered via `chrome.commands` and routed through the service worker, content scripts must not attach redundant in-page DOM keyboard listeners (`keydown`/`keyup`). Global extension commands must have a single authoritative dispatch channel to prevent double-firing and race conditions.
- **Late Hydration Upgrading**: Platform UI adapters using fallback mount points (e.g. mounting directly to a container before dedicated action bars hydrate) must support relocating fallback elements into dedicated native containers if they hydrate in subsequent mutations.
- **Host Platform Styling Fidelity**: Injected action buttons must match host platform primary interactive content contrast tokens (`--color-neutral-content`, `currentColor`) rather than metadata/subtext tokens (`--color-neutral-content-weak`), and must inspect and inherit sibling margins (`margin-inline-start`) rather than assuming parent container flex `gap`.
- **Visible Failure Feedback**: Extraction and clipboard failures must surface user-visible feedback (Thread Action Micro-Feedback for clicks, an error toast for shortcuts), with Thread Action failures also logging a diagnostic to the console. Expected non-actions (editing a field, no thread target, feed listings) must not surface failure feedback.

## Testing Practices

- **Fixture Scope**: Parse test fixtures at module or `beforeAll` scope rather than repeatedly inside individual assertions.
- **Realistic DOM Fidelity**: DOM-to-Markdown changes must be verified against the representative host fixture in `tests/fixtures/`, including nested content containers, not only minimal hand-authored fixtures.
- **DOM-Bound Adapter Testing**: Adapter and UI layer tests requiring DOM APIs must declare `// @vitest-environment happy-dom` at the file header, keeping `vitest.config.ts` default environment as `node` for pure core isolation.
- **Seam-Driven Verification**: Test public interfaces and pipeline seams, avoiding assertions coupled to internal implementation helpers.
- **Side-Effect Free Test Runs**: Unit tests running in Node.js must not emit unexpected stdout logs or access unmocked browser globals.
