# ThreadToLLM

## Agent skills

### Issue tracker

GitHub issues tracked via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` and `docs/adr/` at repo root). See `docs/agents/domain.md`.

### Specifications

The GitHub issue is the authoritative spec. Durable research notes live in `docs/research/`.

### Decision history

Deliberately disabled or reversed features and why: `docs/agents/decision-history.md`.

### Agent workflow

Diagnostic harnesses, reviewing uncommitted work, and git-history inspection: `docs/agents/agent-workflow.md`.

### Coding standards

Coding standards and review rules live in `CODING_STANDARDS.md`.

### Live host verification

Reddit blocks server-side fetches (HTTP 403 / bot-check). Verify DOM extraction against the representative fixtures in `tests/fixtures/`, not live threads; new rich-text fixtures must include the host's nested content wrappers.

### Git workflow

- Linear trunk on `master`.
- Push to `origin master` upon completing each ticket once TDD passes and code review is clean.
- Reference ticket in commit messages (`#<n>`).

