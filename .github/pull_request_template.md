## Description

<!-- Provide a concise explanation of the changes introduced and the problem or ticket they address. -->

Closes # <!-- Reference the issue or ticket number, e.g. Closes #15 -->

## Type of Change

- [ ] `fix`: Bug fix (non-breaking change fixing an extraction defect or UI glitch)
- [ ] `feat`: New feature or Host Platform adapter
- [ ] `refactor`: Code refactoring without behavioral changes
- [ ] `perf`: Performance or token-efficiency optimization
- [ ] `docs`: Documentation updates, glossary terms, or ADRs
- [ ] `test`: New or updated tests
- [ ] `chore`: Tooling, build system, or dependencies

## Verification Checklist

Please verify all items below before requesting review:

- [ ] **Conventional Commits**: Every commit message follows the Conventional Commits specification (e.g., `feat(adapter): add hacker-news platform adapter (#42)`).
- [ ] **Check Suite Passes Cleanly**: Executed `npm run check` locally with 0 errors and 0 warnings (runs ESLint, dual TypeScript typechecks for core and extension, Vitest suite, and production Vite build).
- [ ] **Automated Test Coverage**: Added unit or integration tests verifying the new behavior or regression fix. (Tests requiring DOM APIs use `// @vitest-environment happy-dom`; pure core tests run in default Node environment).
- [ ] **Three-Layer Architectural Seams (ADR-0009)**:
  - `src/core/` remains pure TypeScript with zero DOM or Chrome extension API dependencies.
  - `src/adapters/` maintains decoupled `PlatformAdapter` (DOM extraction) and `PlatformUI` (action injection) contracts (ADR-0006).
  - `src/extension/` manages lifecycle, shortcuts, and toast micro-feedback without leaking DOM/Chrome bindings into core.
- [ ] **Domain Language Compliance**: All names, identifiers, and comments adhere to canonical terms defined in `GLOSSARY.md` (e.g., `Host Platform`, `Original Post`, `Thread Document`, `Comment Tree`, `Hydrated Comment`, `Deleted Placeholder`, `Leaf Comment`).
- [ ] **Documentation & ADRs**: Updated `README.md`, `CONTRIBUTING.md`, or authored a new Architectural Decision Record in `docs/adr/` if new architectural decisions were made.
