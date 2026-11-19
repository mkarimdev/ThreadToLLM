# Agent workflow notes

## Reviewing work before it is committed

The `code-review` skill's `git diff <fixed>...HEAD` is empty while changes are uncommitted. Use `git diff HEAD` as the diff and enumerate untracked files with `git status --short`; pass both to each reviewer sub-agent. Commit only after review is clean.

## Diagnostic harnesses

Put throwaway repro tests in `.scratch/` (gitignored) and delete them after the run. Keep the loop tight: assert the user's exact symptom, run a single test file with `-t`, and remove the harness once it has gone red and then green.

## Inspecting git history

Use `git show -s --format='%h %s%n%b' <hash>` to read a specific commit's message. `git log <hash1> <hash2>` lists every commit reachable from those hashes, not just those two.
