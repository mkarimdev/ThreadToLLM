# Coding Standards

Judgement calls and architectural rules enforced during code review.

## Layer Boundaries (ADR-0009)

- **Pure Core**: Code in `src/core/` must remain pure TypeScript with zero DOM or Chrome extension API dependencies (enforced at compile time via `tsconfig.core.json`).
- **Single Canonical Export**: Core utilities should export a single canonical form (either a pure function or a stateless class), avoiding redundant singleton instances or wrapper delegation functions.
- **Decoupled Adapters**: Platform DOM extraction (`PlatformAdapter`) and UI injection (`PlatformUI`) must remain decoupled interfaces (ADR-0006).
- **Barrel Purity**: Entry-point scripts with runtime side-effects (such as content scripts or service workers) must not execute top-level actions when re-exported in layer barrel files (`index.ts`). Guard top-level execution behind environment checks or isolate entry points.

## Testing Practices

- **Fixture Scope**: Parse test fixtures at module or `beforeAll` scope rather than repeatedly inside individual assertions.
- **Seam-Driven Verification**: Test public interfaces and pipeline seams, avoiding assertions coupled to internal implementation helpers.
- **Side-Effect Free Test Runs**: Unit tests running in Node.js must not emit unexpected stdout logs or access unmocked browser globals.
