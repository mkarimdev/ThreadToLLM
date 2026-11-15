# Coding Standards

Judgement calls and architectural rules enforced during code review.

## Layer Boundaries (ADR-0009)

- **Pure Core**: Code in `src/core/` must remain pure TypeScript with zero DOM or Chrome extension API dependencies (enforced at compile time via `tsconfig.core.json`).
- **Single Canonical Export**: Core utilities should export a single canonical form (either a pure function or a stateless class), avoiding redundant singleton instances or wrapper delegation functions.
- **Decoupled Adapters**: Platform DOM extraction (`PlatformAdapter`) and UI injection (`PlatformUI`) must remain decoupled interfaces (ADR-0006).
- **Account vs. Content Deletion**: Adapters must never classify a comment as deleted solely because its author handle is `[deleted]` or missing. Deleted state requires explicit comment deletion attributes (`deleted="true"`) or purged body content (`[deleted]`, `[removed]`).
- **Barrel Purity**: Entry-point scripts with runtime side-effects (such as content scripts or service workers) must not execute top-level actions when re-exported in layer barrel files (`index.ts`). Guard top-level execution behind environment checks or isolate entry points.

## Testing Practices

- **Fixture Scope**: Parse test fixtures at module or `beforeAll` scope rather than repeatedly inside individual assertions.
- **DOM-Bound Adapter Testing**: Adapter and UI layer tests requiring DOM APIs must declare `// @vitest-environment happy-dom` at the file header, keeping `vitest.config.ts` default environment as `node` for pure core isolation.
- **Seam-Driven Verification**: Test public interfaces and pipeline seams, avoiding assertions coupled to internal implementation helpers.
- **Side-Effect Free Test Runs**: Unit tests running in Node.js must not emit unexpected stdout logs or access unmocked browser globals.
