# ThreadToLLM

## Agent skills

### Issue tracker

GitHub issues tracked via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` and `docs/adr/` at repo root). See `docs/agents/domain.md`.

### Specifications

Detailed user stories, architecture requirements, and implementation specs live in `.scratch/spec.md`.

### Coding standards

Coding standards and review rules live in `CODING_STANDARDS.md`.

### Git workflow

- Linear trunk on `master`.
- Push to `origin master` upon completing each ticket once TDD passes and code review is clean.
- Reference ticket in commit messages (`#<n>`).

