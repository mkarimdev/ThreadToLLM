# Research note — Issue #20: detect and flag unexpanded replies / partial threads

> **Audit/research artifact only.** No production code, tests, fixtures, or git state were modified to produce this note. All claims are traced to primary sources: `gh issue view 20`, git history (`git show`/`git log`), and first-party source/test/fixture/ADR/standard files. Line numbers refer to the current working tree unless a commit hash is given. Where a source is a historical file, the citation is written as `git show <hash>:<path>:<line>`.

## Decision log

- **Status (2026-11-19): implemented** on the working tree; detection now lives in `src/adapters/reddit/reddit.adapter.ts` and is covered by adapter + e2e tests.
- **Scope (issue owner, 2026-11-19): emit only the boolean flag.** Do **not** add `extracted_comments` / `reported_comments` (or any other count keys) to frontmatter. Rationale: the inflated host count is the misleading signal this change is meant to stop relying on. Consequence: §6.2 is out of scope, `src/core/serializer.ts` needs no change for this ticket (it already emits the flag at `:113-115`), and the frontmatter contract tests at `tests/serializer.test.ts:70-103` remain untouched.

## 0. Source inventory and provenance

| Source | What it establishes |
| --- | --- |
| `gh issue view 20` (issue #20, OPEN, labels `enhancement`/`help wanted`/`needs-triage`, author mkarimdev) | Motivation, 3 proposed approaches, 4 acceptance criteria (ACs). Quoted verbatim in §1. |
| `git show 42e2ad6^:src/adapters/reddit/reddit.adapter.ts` | The **complete removed detection implementation** (518 lines). Quoted in §3. |
| `git show 5658ba2` (2026-11-16 02:00, "scope partial load detection to comment tree with tolerance margin (#12)") | Original detection: tolerance margin + `#comment-tree` scoping. |
| `git show 33e053f` (2026-11-16 03:06, "ignore comment hovercard loaders (#8)") | False-positive hardening: `shreddit-comment-tree-action` trigger check and the hovercard/`bundlename` rule. |
| `git show 42e2ad6` (2026-11-16 04:02, "disable partial load detection") | Deliberate removal; its e2e diff shows exactly which two assertions were flipped from `toContain('isPartiallyLoaded: true')` to `not.toContain(...)`. |
| `git show 07dfb8c` (2026-11-16 04:36) | Added `CODING_STANDARDS.md` **DOM-Availability Extraction** rule — the rule that now contradicts the issue. |
| `git show af3c2f6` (2026-11-17 15:40) | Added the "representative" real fixture content, live-host-verification guardrail in `AGENTS.md`, and `Realistic DOM Fidelity` standard. |
| `src/`, `tests/`, `docs/adr/`, `CODING_STANDARDS.md`, `CONTRIBUTING.md` | Current contracts and lock-in tests cited inline below. |

There is **no research-note convention** in the tracked tree: `git ls-files` shows only `docs/adr/*` and `docs/agents/*` under `docs/`. `.scratch/` and `.agents/` are gitignored (`.gitignore:7-8`; ignore history at commit `a111313`). This note is therefore placed in the durable, tracked location `docs/research/issue-20-partial-thread-detection.md`.

`.scratch/spec.md` contains **no** matching content for issue #20 (searched for `20`, `partial`, `isPartiallyLoaded`, `truncat`: no matches); the GitHub issue body is the authoritative spec.

---

## 1. Issue #20 verbatim requirements (primary source: `gh issue view 20`)

**Motivation (community quote, issue body):** *"Would be nice to flag when replies haven't been loaded yet. I'd hate to feed it half a thread and get a confident summary that misses the comment where someone points out the whole answer is wrong."*

**Current behavior per issue:** *"In `v0.1.1`, `isPartiallyLoaded` is hardcoded to `false` in the Reddit adapter."* Verified: `src/adapters/reddit/reddit.adapter.ts:51`.

**Technical challenges to avoid false positives (issue body, verbatim intent):**
1. `<shreddit-post comment-count="...">` counts removed, spam-filtered and shadowbanned comments that never render DOM elements.
2. Background widgets such as `<faceplate-partial>` can be mistaken for comment loaders unless strictly scoped to `#comment-tree`.

**Three proposed approaches (issue body):**
1. **Unexpanded Action Detection** — active, unclicked pagination triggers inside `#comment-tree` (`<shreddit-comment-tree-action>`, buttons labelled "more replies"/"more comments").
2. **Tolerance / Ratio Threshold** — `extracted < reported * 0.75` or a gap, avoiding FPs on fully scrolled short threads.
3. **Transparent Frontmatter Counts** — optionally expose `extracted_comments` vs `reported_comments`.

**Acceptance criteria (ACs, verbatim):**
- **AC1** — Reddit adapter identifies when subtrees or pagination elements remain unexpanded.
- **AC2** — YAML frontmatter indicates partial thread status (`isPartiallyLoaded: true` or extracted vs reported counts).
- **AC3** — No false positives on fully-scrolled threads where shadowbanned/purged comments cause minor count discrepancies.
- **AC4** — Vitest coverage for both partially expanded and fully expanded DOM fixtures.

---

## 2. RQ1 — Exact current call path, data flow, and why the adapter is the correct layer

### 2.1 Call path (DOM → clipboard)

```
DOM (host page)
  └─ RedditAdapter.extract(domRoot)                 src/adapters/reddit/reddit.adapter.ts:30-59
       ├─ findPostElement(domRoot)                  :31, impl :273-281
       ├─ commentRoot = postEl.closest(THREAD_MODAL_SELECTOR) ?? domRoot   :39
       ├─ extractOriginalPost(postEl)               :41, impl :294-337
       ├─ extractCommentTree(commentRoot, opAuthor) :42, impl :61-95 (querySelectorAll('shreddit-comment') at :65)
       ├─ extractedCount = countComments(comments)  :43 (pure helper at src/core/types.ts:78-88)
       └─ metadata = { …, extractedCount, isPartiallyLoaded: false }  :45-52  ← HARDCODED at :51
  └─ FilterPipeline.filter(rawDocument)            src/core/filters/pipeline.ts:106-121
       └─ returns { metadata: { ...doc.metadata }, … }  :117  ← metadata copied UNCHANGED
  └─ MarkdownSerializer.serialize(filteredDocument) src/core/serializer.ts:104-141
       └─ frontmatter :108-116; conditional `isPartiallyLoaded: true` at :113-115
  └─ navigator.clipboard.writeText(...)             reddit.ui.ts:241 / shortcut-handler.ts:86
```

There are three entry points that all follow this chain:
- `extractAndSerialize()` — `src/adapters/reddit/extract-and-serialize.ts:16-25` (the e2e seam used by `tests/reddit-e2e.test.ts:3`).
- `RedditUI.executeExtractionAndCopy()` — `src/adapters/reddit/reddit.ui.ts:223-244` (click path; root resolved via `findThreadRoot` at :227).
- Shortcut handler — `src/extension/shortcut-handler.ts:60-94` (root at :72, pipeline/serializer at :74-76).

### 2.2 Where detection plugs in

The removed implementation called detection as the **last computation before building metadata**:
`const isPartiallyLoaded = this.detectPartialLoad(domRoot, postEl, extractedCount);`
— `git show 42e2ad6^:src/adapters/reddit/reddit.adapter.ts:37`, with the result assigned at `:45`.

**Recommendation:** restore that exact seam at `src/adapters/reddit/reddit.adapter.ts:43-51`, but pass **`commentRoot` (the modal-scoped root from `:39`)** as the detection root instead of the raw `domRoot`. Detection must mirror the same root already used for `extractCommentTree` at `:42`; otherwise background-feed widgets above/beside an open modal can be misread as comment loaders.

### 2.3 Why the adapter is the correct layer

- `src/core/` must be pure TypeScript with zero DOM/Chrome dependencies (`CODING_STANDARDS.md:7`; ADR-0009), so DOM custom-element inspection cannot live in the pipeline or serializer.
- `FilterPipeline` is a pure IR transformer (`src/core/filters/pipeline.ts:106-121`) and copies metadata verbatim (`:117`); it has no access to host attributes like `comment-count`.
- `MarkdownSerializer` consumes only the canonical `ThreadDocument` (`src/core/serializer.ts:104`) and already conditionally emits the flag (`:113-115`), so the boolean only needs to be placed on `ThreadMetadata`.
- The downstream type contract already exists: `isPartiallyLoaded: boolean` is required on `ThreadMetadata` (`src/core/types.ts:20-21`), and the passing serializer test at `tests/serializer.test.ts:41-53` proves end-to-end support for `true`.
- Therefore the adapter is the **only** layer that has both (a) the raw host DOM signals and (b) the established metadata channel to downstream consumers. No UI, pipeline, or serializer change is required to set the boolean (only frontmatter *additions* would touch the serializer — see §6).

---

## 3. RQ2 — Full reconstruction of the removed detection implementation

**Source:** `git show 42e2ad6^:src/adapters/reddit/reddit.adapter.ts` (the parent of the disable commit; this is the most valuable single source). Line numbers below are in that file.

### 3.1 `COMMENT_COUNT_TOLERANCE_MARGIN` (dead artifact)

```ts
export const COMMENT_COUNT_TOLERANCE_MARGIN = 2;
```
— `git show 42e2ad6^:src/adapters/reddit/reddit.adapter.ts:9`; still present but **unused** at `src/adapters/reddit/reddit.adapter.ts:11`. It is imported and asserted only by `tests/reddit-adapter.test.ts:3` and `:667-669`. It is **not** used by any production code path today.

### 3.2 The five detection methods (all deleted by `42e2ad6`)

**`isGlobalPageWidget(el)` — global-widget exclusion guard (`:55-61`):**
```ts
private isGlobalPageWidget(el: Element): boolean {
  return Boolean(el.closest(
    'aside, nav, header, [slot="sidebar"], [data-testid*="sidebar"], #sidebar, .sidebar, shreddit-drawer, [slot="drawer"], faceplate-drawer, [data-testid*="drawer"]'
  ));
}
```
Reusable as-is. This is what protects against the e2e sidebar/drawer loaders at `tests/reddit-e2e.test.ts:113-119` and adapter fixtures at `tests/reddit-adapter.test.ts:260-267`.

**`isCommentTreeLoader(el)` — candidate classifier (`:63-119`):**

*Rule 1 — unclicked pagination triggers (`:70-84`):*
```ts
if (tagName === 'shreddit-comment-tree-action' ||
    tagName === 'shreddit-more-comments' ||
    tagName === 'more-comments') {
  if (tagName === 'shreddit-comment-tree-action') {
    const hasTrigger = el.querySelector(
      'button, [role="button"], faceplate-partial, shreddit-async-loader, shreddit-loading'
    );
    return Boolean(hasTrigger);      // hardened by 33e053f
  }
  return true;
}
```
The `hasTrigger` check was added in `33e053f` (diff hunk `@@ -73,6 +73,13 @@`) specifically so an inert/empty `shreddit-comment-tree-action` wrapper does not produce a false positive. Reusable.

*Rule 2 — loaders explicitly hitting the comments endpoint (`:86-90`):*
```ts
const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
if (/\/comments\//i.test(src)) return true;
```
Reusable but must still be combined with the global-widget guard (rule runs after `:64-66`). It is the only reason `partialFaceplateFixture` at `tests/reddit-adapter.test.ts:220-228` (`<faceplate-partial src="/svc/shreddit/comments/more">`) would be flagged.

*Rule 3 — loaders directly in the tree, not in a single comment (`:92-100`):*
```ts
const insideCommentTree = Boolean(
  el.closest('#comment-tree, [id*="comment-tree"], shreddit-comment-tree-action')
);
const insideSingleComment = Boolean(el.closest('shreddit-comment'));
if (insideCommentTree && !insideSingleComment) return true;
```
This is the `#comment-tree` scoping introduced by `5658ba2` ("scope partial load detection to comment tree with tolerance margin").

*Rule 4 — loaders inside a single comment (`:102-116`), the hovercard fix from `33e053f`:*
```ts
if (insideSingleComment) {
  if (tagName === 'shreddit-loading' ||
      tagName === 'shreddit-more-comments' ||
      tagName === 'more-comments') return true;
  const bundleName = el.getAttribute('bundlename')?.toLowerCase() || '';
  if (bundleName.includes('comment') || bundleName.includes('repl')) return true;
}
```
`33e053f`'s commit message is "…ignore comment hovercard loaders"; its diff replaces the old single scoping `if (el.closest('#comment-tree, …, shreddit-comment, …')) return true` with the split rules 3/4. This is what excludes `bundlename="faceplate_hovercard"` loaders in `tests/fixtures/real-reddit-thread.fixture.ts:52,62,68`. **Reusable and essential.**

**`hasUnclickedPaginationButton(domRoot)` — text/aria fallback (`:121-154`):**
```ts
for (const btn of domRoot.querySelectorAll('button')) {
  if (this.isGlobalPageWidget(btn)) continue;
  if (!btn.closest('#comment-tree, [id*="comment-tree"], shreddit-comment-tree-action, shreddit-comment')) continue;
  const text = btn.textContent?.toLowerCase() || '';
  const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
  if (text.includes('more comment') || text.includes('more repl') ||
      ariaLabel.includes('more comment') || ariaLabel.includes('more repl')) return true;
}
```
Wrapped in `try/catch` (`:122-151`). Reusable; English-only string matching is an open question (§9).

**`detectPartialLoad(domRoot, postEl, extractedCount)` — orchestrator (`:156-194`):**
```ts
const candidateSelectors = [
  'shreddit-comment-tree-action', 'shreddit-more-comments', 'more-comments',
  'faceplate-partial', 'shreddit-async-loader', 'shreddit-loading',
];
try {
  for (const el of domRoot.querySelectorAll(candidateSelectors.join(',')))
    if (this.isCommentTreeLoader(el)) return true;
  if (this.hasUnclickedPaginationButton(domRoot)) return true;
} catch { /* unsupported-selector guard */ }

const rawCommentCount = postEl.getAttribute('comment-count');        // :185
if (rawCommentCount !== null) {
  const commentCount = parseInt(rawCommentCount, 10);
  if (!isNaN(commentCount) && (commentCount - extractedCount) > COMMENT_COUNT_TOLERANCE_MARGIN) // :188
    return true;
}
return false;
```
The **count fallback at `:185-191` is the bug that must NOT be restored as an authoritative trigger** — see §5.2.

### 3.3 Reusable vs buggy/missing

| Element | Verdict | Reason |
| --- | --- | --- |
| `isGlobalPageWidget` (`:55-61`) | **Reuse** | Directly implements issue challenge #2. |
| Rule 1 + `hasTrigger` (`:70-84`) | **Reuse** | Maps exactly to proposed approach #1; hardened already. |
| Rule 2 `/comments/` src (`:86-90`) | **Reuse** | Legitimate loader signal; scoped by the global-widget guard. |
| Rule 3 tree-scoped loader (`:92-100`) | **Reuse** | Implements "strictly scoped to `#comment-tree`". |
| Rule 4 hovercard exclusion (`:102-116`) | **Reuse** | Prevents the fixture FP at `tests/fixtures/real-reddit-thread.fixture.ts:52,62,68`. |
| `hasUnclickedPaginationButton` (`:121-154`) | **Reuse** | Approach #1 for button-based UIs. |
| Count fallback (`:185-191`) | **Do NOT reuse as authoritative** | Fails AC3 on the real fixture (worked when written; fixture added later in `af3c2f6`). |
| `try/catch` selector guards (`:170-183`, `:149-151`) | **Reuse** | Custom-element selector robustness. |
| Modal scoping | **MISSING — add** | Old code passed raw `domRoot`; must pass `commentRoot` from `src/adapters/reddit/reddit.adapter.ts:39` (issue #23 interaction, §9). |
| Frontmatter counts | **MISSING — add** | Approach #3 not implemented; needs metadata extension (§6). |

Note: the old file also contained `extractTextContent` (`:232-243`) which was later replaced by `domToMarkdown` (`src/adapters/reddit/reddit.adapter.ts:97-103`, imported at `:9`). That change is unrelated to partial detection and should not be reverted.

---

## 4. RQ3 — Complete inventory of modern-Reddit partial-thread DOM signals

Every signal below is cited to a primary source. "FP source" = known false-positive source and why.

| Signal | Primary-source citations | FP source / why |
| --- | --- | --- |
| `shreddit-comment-tree-action` | `git show 42e2ad6^:…:72,77-82,162`; `tests/reddit-adapter.test.ts:215-217`; `tests/reddit-e2e.test.ts:91-93` | Empty/inert wrapper → FP; fixed by `hasTrigger` (33e053f). Must also be scoped or global-widget-guarded. |
| `shreddit-more-comments` | `git show 42e2ad6^:…:73,107,163`; `tests/reddit-adapter.test.ts:309`; `tests/reddit-e2e.test.ts:138` | **Legitimate positive**: an unclicked "more comments" element. Conflicts with current e2e `:211` assertion (§5.3). |
| `more-comments` | `git show 42e2ad6^:…:74,108,164` | Same as above (legacy tag alias). |
| `faceplate-partial` | `git show 42e2ad6^:…:79,165`; `tests/reddit-adapter.test.ts:227,261,265`; `tests/reddit-e2e.test.ts:114,118` | **Major FP source**: sidebar/drawer/background widgets. Issue body challenge #2 names this tag explicitly; excluded by `isGlobalPageWidget`. |
| `shreddit-async-loader` | `git show 42e2ad6^:…:79,166`; `tests/reddit-adapter.test.ts:262,266,321`; `tests/reddit-e2e.test.ts:115`; `tests/fixtures/real-reddit-thread.fixture.ts:52,62,68` | **Major FP source**: author hovercards *inside comments* (`bundlename="faceplate_hovercard"`) at fixture `:52,62,68`; excluded by rule 4 (`:112-115`). Also sidebar loaders at e2e `:115`. |
| `shreddit-loading` | `git show 42e2ad6^:…:106,167`; `tests/reddit-adapter.test.ts:332` | Treated as a positive *inside a comment* (rule 4) — but hovercards use `shreddit-async-loader`, not this tag, so safe in the known fixtures. |
| `bundlename` attribute | `git show 42e2ad6^:…:112-115`; `tests/fixtures/real-reddit-thread.fixture.ts:52,62,68` (`faceplate_hovercard`) | Value `faceplate_hovercard` must be excluded; values containing `comment`/`repl` are positives. |
| `comment-count` on `shreddit-post` | `git show 42e2ad6^:…:185-191`; `tests/reddit-adapter.test.ts:232,241,250,272,286,300,315,327,339`; `tests/reddit-e2e.test.ts:103,129`; `tests/fixtures/real-reddit-thread.fixture.ts:19` (`"26"`) | **Major FP source** (issue body challenge #1): inflated by removed/spam/shadowbanned comments that never render. Real fixture: `26` reported vs `3` rendered (`fixture:19` vs `:47-70`). |
| `src` / `data-src` containing `/comments/` | `git show 42e2ad6^:…:87-90`; `tests/reddit-adapter.test.ts:227` | Generic widget hits are possible; mitigated by global-widget exclusion. |
| `button` text / `aria-label` | `git show 42e2ad6^:…:138-147`; `tests/reddit-adapter.test.ts:216` ("View 15 more replies"), `:345` (`aria-label="Load more comments"`); `tests/reddit-e2e.test.ts:92`; `tests/fixtures/real-reddit-thread.fixture.ts:37-42` (`aria-label="Upvote"/"Comments"/"Repost"/"Share"` in the **post action bar**) | Post action-bar buttons are **not** pagination; excluded by the `#comment-tree`/`shreddit-comment` scope check at `git show 42e2ad6^:…:130-136`. |
| Container scope `#comment-tree`, `[id*="comment-tree"]` | `git show 42e2ad6^:…:94,132`; `tests/reddit-adapter.test.ts:252,274,288,302,317,329,341`; `tests/reddit-e2e.test.ts:29,108,134`; `tests/fixtures/real-reddit-thread.fixture.ts:46` | Positive scoping anchor required by the issue body. |
| Global-widget containers (`aside`, `[slot="sidebar"]`, `[slot="drawer"]`, …) | `git show 42e2ad6^:…:58`; `tests/reddit-adapter.test.ts:260-267`; `tests/reddit-e2e.test.ts:113-119` | Exclusion list, not a positive signal. |
| Modal overlay `faceplate-modal, shreddit-post-dialog, dialog[open], [role="dialog"]` | `src/adapters/reddit/reddit.selectors.ts:9-11`; used at `src/adapters/reddit/reddit.adapter.ts:39` | Not a partial signal; determines the **correct detection root** (§9). |

---

## 5. RQ4 — Concrete detection algorithm (ordered signals + guards)

### 5.1 Recommended algorithm

1. **Resolve detection root** = `commentRoot` from `src/adapters/reddit/reddit.adapter.ts:39` (`postEl.closest(THREAD_MODAL_SELECTOR) ?? domRoot`). Do **not** use the raw `domRoot` used by the old code (`git show 42e2ad6^:…:37`).
2. **Global-widget guard first** for every candidate: reuse `isGlobalPageWidget` (`git show 42e2ad6^:…:55-61`) → immediate `false`.
3. **Primary (authoritative) signals — any one suffices**, all scoped to the detection root:
   1. `shreddit-more-comments` / `more-comments` **anywhere in `#comment-tree`** (regardless of its `count` value — even `count="1"` denotes an unexpanded subtree, cf. `tests/reddit-adapter.test.ts:298-311`).
   2. `shreddit-comment-tree-action` **with an active trigger** (`button`, `[role="button"]`, `faceplate-partial`, `shreddit-async-loader`, `shreddit-loading`) — `git show 42e2ad6^:…:77-82`.
   3. Unclicked pagination `button`/`[role=button]` with text or `aria-label` matching `/more comment|more repl/i`, scoped to `#comment-tree`, `shreddit-comment-tree-action`, or `shreddit-comment` — `git show 42e2ad6^:…:121-154`.
   4. Loader tags (`faceplate-partial`, `shreddit-async-loader`, `shreddit-loading`) directly inside `#comment-tree` but **not** inside a single `shreddit-comment` — rule 3 at `git show 42e2ad6^:…:92-100`.
   5. Loader with `src`/`data-src` matching `/\/comments\//i` outside global widgets — rule 2 at `:86-90`.
   6. Loader **inside** a single comment only when `shreddit-loading`/`shreddit-more-comments`/`more-comments`, or `bundlename` contains `comment`/`repl` — rule 4 at `:102-116` (excludes hovercards).
4. **Count is NOT a trigger.** Parse `postEl.getAttribute('comment-count')` only to populate an optional `reportedCount` for frontmatter disclosure (§6). Do not return `true` from a count gap.
5. Return `false` otherwise; keep `try/catch` guards (`git show 42e2ad6^:…:170-183`). Signal **1 is primary** because it is a direct, DOM-evidenced, unclicked pagination element — exactly issue approach #1 and AC1. Signals 4–6 are supporting generic-loader signals; 2–3 cover alternative host renderings.

### 5.2 Precise tolerance / ratio semantics — why both fail AC3

| Rule | Formula / source | Concrete counterexample from primary sources |
| --- | --- | --- |
| Existing margin | `(commentCount - extractedCount) > 2` — `git show 42e2ad6^:…:188`; constant `2` at `src/adapters/reddit/reddit.adapter.ts:11` | Real fixture: `comment-count="26"` (`tests/fixtures/real-reddit-thread.fixture.ts:19`) vs `3` rendered comments (`:47-70`) → gap `23 > 2` → **FALSE POSITIVE** against `tests/reddit-e2e.test.ts:223` (`not.toContain('isPartiallyLoaded')`). |
| Proposed ratio | `extracted < reported * 0.75` (issue approach #2) | Real fixture: `3 < 26*0.75 = 19.5` → FP at e2e `:223`. Sidebar fixture: `comment-count="3"` (`tests/reddit-e2e.test.ts:103`) vs `1` comment (`:109-111`) → `1 < 2.25` → **FALSE POSITIVE** at e2e `:201`, even though the loaders are in `aside`/drawer (`:113-119`) and correctly excluded by the global-widget guard. |

Therefore **neither count rule can be a standalone or OR-ed trigger**. The tolerance margin must be deleted as a dead artifact (`COMMENT_COUNT_TOLERANCE_MARGIN` at `src/adapters/reddit/reddit.adapter.ts:11`, test at `tests/reddit-adapter.test.ts:667-669`) or retained only as a documented *disclosure* threshold — never for the boolean. Counts belong in frontmatter as transparent data (approach #3), letting the LLM judge completeness, which is precisely the issue's framing.

### 5.3 The two contradictory e2e fixtures — how the algorithm resolves them

- **`pendingPaginationRoot`** (`tests/reddit-e2e.test.ts:122-140`): `comment-count="2"`, **1** rendered comment, and `<shreddit-more-comments count="5">` inside `#comment-tree` (`:138`). Current assertion at `:211` is `not.toContain('isPartiallyLoaded')`. Under the recommended algorithm this is **correctly flagged** (signal 3a). This assertion **must be inverted** to `toContain('isPartiallyLoaded: true')`, restoring the pre-`42e2ad6` assertion (see `git show 42e2ad6 -- tests/reddit-e2e.test.ts`, hunk `@@ -201,13 +201,13 @@` where it previously read `expect(markdown).toContain('isPartiallyLoaded: true')`). This is required by AC1; the current test encodes the disabled behavior and is stale.
- **`real-reddit-thread.fixture.ts`** (`tests/fixtures/real-reddit-thread.fixture.ts:19,46-71`): `comment-count="26"`, 3 comments, 3 hovercard `shreddit-async-loader`s (`:52,62,68`), no pagination element. Signal 3a–3f all return `false` (rule 4 excludes hovercards; post action-bar buttons at `:37-42` are out of scope). The count-only rule would flag it, so removing count detection keeps `tests/reddit-e2e.test.ts:223` (`not.toContain`) passing. **This fixture stays unflagged — do not change `:223`.**

Similarly, `linkPostRoot` (`tests/reddit-e2e.test.ts:77-94`) contains `<shreddit-comment-tree-action><button>Load more comments</button></...>` at `:91-93`; the pre-disable e2e test asserted `isPartiallyLoaded: true` there (confirmed by `git show 42e2ad6 -- tests/reddit-e2e.test.ts`, hunk `@@ -180,13 +180,13 @@`). Two implementation options: (a) invert `:190` to expect the flag and add a `#comment-tree` wrapper to that fixture for scope fidelity; or (b) remove the incidental action element so the test remains a pure link-post test. Recommendation: **(a)**, because the element is an unambiguous pagination trigger and AC1 requires flagging it.

---

## 6. RQ5 — Frontmatter schema decision

### 6.1 Existing schema (no change needed for the boolean)

`MarkdownSerializer.serialize()` emits `source`, `title`, `url`, `author`, then conditionally `isPartiallyLoaded: true` — `src/core/serializer.ts:108-116` (conditional at `:113-115`). `formatYamlScalar` (`:12-28`) already handles booleans/numbers/ambiguous strings. This is token-dense per ADR-0005 (`docs/adr/0005-token-dense-markdown-schema.md:3`) and `CODING_STANDARDS.md:14` ("emit optional metadata flags conditionally … maximize prompt token density").

### 6.2 Adding counts (issue approach #3) — **OUT OF SCOPE by owner decision**

> The issue owner chose flag-only. Everything in this subsection is retained for context only; do not implement it as part of #20.

- `ThreadMetadata` (`src/core/types.ts:9-22`) has **no reported-count field**. Add an **optional** field `reportedCount?: number` to avoid breaking the many fixtures/objects that construct metadata without it (`tests/serializer.test.ts:12-20,108-116,156-163`; `tests/fixtures/sample-thread.fixture.ts:5-10`). A required field would break compilation of all of these.
- Adapter populates it from `postEl.getAttribute('comment-count')` (parse with `parseInt` + `isNaN` guard, mirroring `git show 42e2ad6^:…:186-188`), only when present.
- Serializer emits counts **only when partial** (conditional, token-dense): e.g. `extracted_comments: <n>` and `reported_comments: <n>`. Naming choice: the issue uses snake_case `extracted_comments`/`reported_comments`, but existing emitted keys are camelCase (`isPartiallyLoaded`) and internal metadata uses `extractedCount`. **Recommendation:** use camelCase `extractedCount`/`reportedCount` in frontmatter for canonical consistency — but note that either naming requires changing the contract test below. State the decision explicitly in a new ADR (§8).
- **Which `extractedCount` to emit?** `FilterPipeline.filter()` copies metadata unchanged (`src/core/filters/pipeline.ts:117`), so `ThreadMetadata.extractedCount` is a **pre-filter** raw-DOM count (set at `src/adapters/reddit/reddit.adapter.ts:43,50`). User-facing metrics must reflect the post-filter document (`CODING_STANDARDS.md:12`), and the LLM actually sees filtered comments. **Recommendation:** have the serializer compute `countComments(doc.comments)` (pure core helper at `src/core/types.ts:78-88`) for the emitted extracted count, so it matches the serialized tree, and emit `reportedCount` as the raw host value. Document this distinction to avoid the "Accurate Pipeline Feedback" conflict (§9).

### 6.3 Contract tests that must change if counts are added

- `tests/serializer.test.ts:70-103`: the "frontmatter schema contract" test forbids `extracted_count` (`:81`), `extractedCount` (`:82`), `partial_load` (`:83`), and asserts exact key arrays `['source','title','url','author']` (`:80`) and `['source','title','url','author','isPartiallyLoaded']` (`:102`). Add the new conditional keys and update both arrays; decide which forbidden keys remain forbidden.
- `tests/serializer.test.ts:38` and `:41-53`: keep the `not.toContain('isPartiallyLoaded')` on full docs and `toContain('isPartiallyLoaded: true')` on partial docs; add count assertions for the partial case only.
- `tests/fixtures/sample-thread.fixture.ts:70-71` (expected exact frontmatter) — unchanged if counts are emitted only when partial (its `isPartiallyLoaded` is `false` at `:10`), otherwise update.

---

## 7. RQ6 — Complete test plan, mapped to acceptance criteria

### 7.1 Existing assertions to invert / update

| File:line | Current assertion | Required change | AC |
| --- | --- | --- | --- |
| `tests/reddit-adapter.test.ts:611-616` | `false` for `partialTreeActionFixture` (`shreddit-comment-tree-action` + "View 15 more replies" at `:215-217`) | invert to `true`; wrap fixture in `#comment-tree` for scope fidelity | AC1 |
| `tests/reddit-adapter.test.ts:618-623` | `false` for `partialFaceplateFixture` (`faceplate-partial src="/svc/shreddit/comments/more"` at `:227`) | invert to `true` (rule 2) | AC1 |
| `tests/reddit-adapter.test.ts:625-630` | `false` for `partialCommentCountFixture` (`comment-count="45"`, 1 comment, no DOM signals at `:230-237`) | **keep `false`** but retitle as a guardrail: "count-only discrepancy does not flag" | AC3 |
| `tests/reddit-adapter.test.ts:632-637` | `false` for `fullyHydratedFixture` | keep `false` | AC3 |
| `tests/reddit-adapter.test.ts:639-644` | `false` for sidebar/drawer widgets | keep `false` (global-widget guard) | AC3 |
| `tests/reddit-adapter.test.ts:646-651` | `false` for `commentTreeScopedAsyncLoaderFixture` (`shreddit-async-loader` directly in `#comment-tree`, `:313-323`) | invert to `true` (rule 3; count is only 1 — proves loader signal is independent of count) | AC1 |
| `tests/reddit-adapter.test.ts:653-658` | `false` for `commentChildLoaderFixture` (`shreddit-loading` inside comment, `:325-335`) | invert to `true` (rule 4) | AC1 |
| `tests/reddit-adapter.test.ts:660-665` | `false` for `unclickedPaginationButtonFixture` (`:337-347`) | invert to `true` (`hasUnclickedPaginationButton`) | AC1 |
| `tests/reddit-adapter.test.ts:667-669` | `COMMENT_COUNT_TOLERANCE_MARGIN === 2` | remove with the dead constant (or keep only if repurposed for disclosure) | — |
| `tests/reddit-adapter.test.ts:492` | `false` for `standardPostFixture` | keep (no signals) | AC3 |
| `tests/reddit-e2e.test.ts:190` | `not.toContain('isPartiallyLoaded')` for link post with action trigger (`:91-93`) | invert to `toContain('isPartiallyLoaded: true')` (per §5.3) | AC1/AC2 |
| `tests/reddit-e2e.test.ts:211` | `not.toContain('isPartiallyLoaded')` for `shreddit-more-comments` (`:138`) | invert to `toContain('isPartiallyLoaded: true')` | AC1/AC2 |
| `tests/reddit-e2e.test.ts:152` | `not.toContain('isPartiallyLoaded')` for fully hydrated text thread | keep | AC3 |
| `tests/reddit-e2e.test.ts:201` | `not.toContain` for sidebar widgets (`comment-count=3`, 1 comment) | keep (ratio rule would break it — §5.2) | AC3 |
| `tests/reddit-e2e.test.ts:223` | `not.toContain` for real fixture (`comment-count=26`, 3 comments, hovercards) | keep (count fallback would break it — §5.2) | AC3 |
| `tests/serializer.test.ts:80-84,102` | frontmatter key arrays / forbidden count keys | update if counts added (§6.3) | AC2 |

The lock-in block heading at `tests/reddit-adapter.test.ts:610` ("DOM-only extraction (partial load detection disabled)") and the test titles at `:611,618,625,632,639,646,653,660` must be renamed from "sets … false" to accurate partial/full semantics. Note: only **5** of the 8 scenario tests should be inverted (`611,618,646,653,660`); `625,632,639` must remain negative assertions. This corrects the blanket "9 false-asserting tests" shorthand — the 9th (`:667`) is a true constant assertion, not a scenario.

### 7.2 New tests required

1. **Partial fixture test (AC1/AC4):** new reusable fixture under `tests/fixtures/` with `#comment-tree`, 1–2 `shreddit-comment`s, an active `<shreddit-comment-tree-action><button>…more replies…</button></...>` and a `<shreddit-more-comments count="5">`; assert `metadata.isPartiallyLoaded === true` via `new RedditAdapter().extract(...)` (adapter seam) and `toContain('isPartiallyLoaded: true')` via `extractAndSerialize(...)` (e2e seam). Parse at `beforeAll` per `CODING_STANDARDS.md:26`.
2. **Fully expanded fixture test (AC3/AC4):** reuse `createRealRedditThreadFixture()` (`tests/fixtures/real-reddit-thread.fixture.ts:11`) plus `fullyHydratedFixture` (`tests/reddit-adapter.test.ts:239-246`); assert `false` despite large count gap and hovercard loaders.
3. **Hovercard-only guardrail (AC3):** assert `false` when a `shreddit-async-loader bundlename="faceplate_hovercard"` sits inside a comment with no pagination element (mirrors fixture `:52,62,68`).
4. **Global-widget guardrail (AC3):** assert `false` for loaders in `aside`/`[slot="drawer"]` with a count gap (e2e `:195-203` already covers it).
5. **Count-only guardrail (AC3):** large `comment-count` gap, no DOM signals → `false` (retired `partialCommentCountFixture`).
6. **Frontmatter counts (AC2, if approach #3 adopted):** serializer tests for conditional emission of `extracted_*`/`reported_*` only when partial, plus post-filter count correctness (§6.2).
7. **Modal-scope test (risk, §9):** partial signal in a background feed card + active modal containing a fully hydrated thread → `false`; partial signal inside the modal → `true`.

---

## 8. RQ7 — Governance / spec work required

1. **New ADR (recommend `docs/adr/0011-...md`): "DOM-evidenced partial-load disclosure".** Decision to record: adapters MAY report `isPartiallyLoaded: true` when, and only when, truncation is **directly evidenced by observable DOM elements** inside the extraction root (explicit unclicked pagination/loader elements); they MUST NOT speculate from inflated host counts. This resolves the contradiction between:
   - `docs/adr/0004-synchronous-hydrated-dom-extraction.md:3`: *"appending explicit truncation metadata to the output if unexpanded comments exist"* — **supports** issue #20; and
   - `CODING_STANDARDS.md:15` (added by `07dfb8c`): *"without speculating or asserting on unhydrated host SPA state (`isPartiallyLoaded`)"* — **contradicts** it when read as a blanket ban.
   The ADR should clarify that "speculating on unhydrated state" means count-based guessing, whereas reading an *already-rendered* "load more" element is synchronous observation, fully compatible with ADR-0004's <50ms snapshot guarantee (no programmatic clicking/scrolling).
2. **Rewrite `CODING_STANDARDS.md:15`** (DOM-Availability Extraction) to the carve-out above. Keep the synchronous-fidelity sentence. Reference the new ADR.
3. **Update `CONTRIBUTING.md:314`** ("**DOM-Availability Extraction**: … Do not speculate or assert on unhydrated host SPA state (`isPartiallyLoaded: false`)") to match; otherwise contributors are told the opposite of the issue.
4. **Optional domain work:** add "Partial thread / Unexpanded subtree / Reported count" to `GLOSSARY.md` (which already defines "Hydrated Comment" at root) using the domain-modeling conventions in `.agents/skills/domain-modeling/`.
5. **No spec file to update:** `.scratch/spec.md` has no issue-#20 content; the issue body (§1) is the spec. Keep standards/CONTRIBUTING/ADR in sync via the review checklist.
6. Ensure the change continues to satisfy `CODING_STANDARDS.md:14` (token-dense conditional frontmatter), `:27` (verify against `tests/fixtures/`), and `:29` (test public seams, not helpers).

---

## 9. RQ8 — Risks, edge cases, open questions

- **Modal-scoped extraction (#23) vs detection root:** `src/adapters/reddit/reddit.adapter.ts:39` chooses `commentRoot` from `THREAD_MODAL_SELECTOR` (`src/adapters/reddit/reddit.selectors.ts:9-11`); the old detector was called with raw `domRoot` (`git show 42e2ad6^:…:37`). Using raw `domRoot` risks reading background-feed widgets. **Must pass `commentRoot`.**
- **Inflated `comment-count`:** issue body challenge #1; real fixture `26` vs `3` (`tests/fixtures/real-reddit-thread.fixture.ts:19,47-70`). Count cannot be authoritative (§5.2).
- **Hovercards:** `bundlename="faceplate_hovercard"` inside comments at fixture `:52,62,68`; must be excluded by rule 4 (`git show 42e2ad6^:…:112-115`).
- **Short-thread tolerance:** a margin of 2 is acceptable for `comment-count="4"` vs 2 comments (`tests/reddit-adapter.test.ts:270-282`) but catastrophically wrong for 26 vs 3. This is why ratio/margin was abandoned.
- **Filter pipeline count semantics:** `ThreadMetadata.extractedCount` is pre-filter (`src/adapters/reddit/reddit.adapter.ts:43`; pipeline copies it at `src/core/filters/pipeline.ts:117`) while user-facing counts are post-filter (`src/adapters/reddit/reddit.ui.ts:243`, `src/extension/shortcut-handler.ts:88-89`), per `CODING_STANDARDS.md:12`. Decide and document which number frontmatter exposes (§6.2 recommendation: post-filter `countComments(doc.comments)`).
- **Inert `shreddit-comment-tree-action`:** empty wrapper without a button/loader must not flag (fixed in `33e053f`, `git show 42e2ad6^:…:77-82`).
- **Post action-bar buttons:** `aria-label="Comments"` etc. at `tests/fixtures/real-reddit-thread.fixture.ts:37-42` are not pagination; scope check at `git show 42e2ad6^:…:130-136` excludes them.
- **Selector fragility / restricted environments:** keep `try/catch` at `git show 42e2ad6^:…:170-183` and `:149-151`.
- **Synchronous constraint:** ADR-0004 (`:3`) forbids programmatic "View more comments" clicking/scrolling; detection must be read-only.
- **Open question — i18n:** button matching is English-only (`/more comment|more repl/`, `git show 42e2ad6^:…:141-144`); non-English Reddit UI would miss signal 3. Consider `data-testid`/attribute-based detection if available.
- **Resolved — frontmatter naming:** moot. Owner chose flag-only; no count keys are emitted, so the snake_case/camelCase question does not arise (§6.2).
- **Open question — orphaned fixtures:** `tests/reddit-adapter.test.ts:270-311` defines `exceedsToleranceMarginFixture` (`:284-296`) and `toleranceWithinMarginWithPaginationTriggerFixture` (`:298-311`) that have **no corresponding tests** in the lock-in block (`:610-670`); decide whether to delete them or convert them into the new guardrail/positive tests (§7.2).

---

## 10. RQ9 — Implementation checklist / AC traceability

| # | Step (primary-source anchor) | AC covered |
| --- | --- | --- |
| 1 | Reconcile governance first: new ADR + rewrite `CODING_STANDARDS.md:15`, `CONTRIBUTING.md:314` (§8) | all (unblocks review) |
| 2 | Restore `detectPartialLoad`, `isCommentTreeLoader`, `isGlobalPageWidget`, `hasUnclickedPaginationButton` verbatim from `git show 42e2ad6^:…:55-194`; pass `commentRoot` from `src/adapters/reddit/reddit.adapter.ts:39` | AC1, AC3 |
| 3 | **Delete** the count-return-true branch `git show 42e2ad6^:…:185-191`; keep count only as optional `reportedCount` metadata | AC3 |
| 4 | Call detection at `src/adapters/reddit/reddit.adapter.ts:43-51`, replacing hardcoded `:51` | AC1 |
| 5 | ~~Add frontmatter count keys (issue approach #3)~~ — **OUT OF SCOPE by owner decision**; no `reportedCount` field, no serializer change, `tests/serializer.test.ts:70-103` unchanged | AC2 already met by existing `src/core/serializer.ts:113-115` |
| 6 | Invert adapter tests `:611,618,646,653,660` and e2e `:190,211`; keep `:625,632,639,152,201,223` negative; rename lock-in block `:610` | AC1, AC2, AC3 |
| 7 | Add partial + full fixtures in `tests/fixtures/` and new tests (§7.2), parsed at `beforeAll` | AC4 |
| 8 | Remove dead `COMMENT_COUNT_TOLERANCE_MARGIN` (`src/adapters/reddit/reddit.adapter.ts:11`, `tests/reddit-adapter.test.ts:3,667-669`) or repurpose for disclosure only | hygiene |
| 9 | Run full Vitest suite; verify no FP on `tests/reddit-e2e.test.ts:201,223` and no regression in `tests/serializer.test.ts:70-103` | AC3 |

**One-line acceptance trace:** AC1 → steps 2,4,6; AC2 → step 5 (boolean already emitted at `src/core/serializer.ts:113-115`); AC3 → steps 3,6 (guardrails `:201`,`:223`); AC4 → step 7.
