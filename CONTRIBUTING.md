# Contributing to ThreadToLLM

Thank you for your interest in contributing to ThreadToLLM! ThreadToLLM is an open-source Chrome extension that extracts social discussion threads from host platforms (such as Reddit) and normalizes them into token-efficient Markdown for LLM ingestion.

We welcome bug reports, feature proposals, documentation improvements, and platform adapter contributions.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [NPM Scripts](#npm-scripts)
  - [Loading the Unpacked Extension in Chrome](#loading-the-unpacked-extension-in-chrome)
- [Git Workflow](#git-workflow)
  - [Trunk-Based Development](#trunk-based-development)
  - [Branch Naming](#branch-naming)
  - [Pull Request Process](#pull-request-process)
- [Conventional Commits](#conventional-commits)
- [Architecture & Platform Adapter Guide](#architecture--platform-adapter-guide)
  - [The Three-Layer Modular Architecture](#the-three-layer-modular-architecture)
  - [Decoupled Contracts: PlatformAdapter vs PlatformUI](#decoupled-contracts-platformadapter-vs-platformui)
  - [Step-by-Step: Adding a New Host Platform](#step-by-step-adding-a-new-host-platform)
  - [Coding Standards & Review Rules](#coding-standards--review-rules)
  - [Testing Practices](#testing-practices)
- [Domain Vocabulary (GLOSSARY)](#domain-vocabulary-glossary)

---

## Code of Conduct

We are committed to providing a friendly, welcoming, and inclusive environment for everyone. Please be respectful, constructive, and considerate in all issue discussions, pull requests, and code reviews.

---

## Development Setup

### Prerequisites

- **Node.js**: v20 LTS or higher (v24 recommended).
- **npm**: v10 or higher.
- **Google Chrome** (or Chromium-based browser such as Brave, Edge, or Arc).

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/mkarimdev/ThreadToLLM.git
cd ThreadToLLM
npm install
```

### NPM Scripts

The project includes several npm scripts for development, building, and verification:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs the Vite development build with watch mode enabled. |
| `npm run build` | Compiles the production extension bundle to the `dist/` directory. |
| `npm test` | Runs the Vitest test suite once across all unit and integration tests. |
| `npm run lint` | Lints all TypeScript and configuration files using ESLint. |
| `npm run typecheck` | Validates TypeScript types across both `tsconfig.json` and `tsconfig.core.json`. |
| `npm run typecheck:core` | Validates that `src/core/` compiles in isolation without DOM or Chrome types. |
| `npm run check` | **Mandatory Pre-PR Suite**: Runs linting, dual typechecks, test suite, and production build. |

> [!TIP]
> Always execute `npm run check` before submitting a Pull Request. CI runs this exact suite and rejects PRs with any failures or warnings.

### Loading the Unpacked Extension in Chrome

To test the extension live in your browser:

1. Build the extension:
   ```bash
   npm run build
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. In the top-right corner, enable **Developer mode**.
4. In the top-left corner, click **Load unpacked**.
5. Select the `dist/` directory inside your ThreadToLLM repository root.
6. The extension is now loaded! Navigate to a Reddit discussion thread (e.g., `https://www.reddit.com/r/technology/...`) to test the in-page **Thread Action** button and the `Alt+Shift+C` keyboard shortcut.
7. After making code changes and rebuilding (`npm run build`), click the refresh icon on the ThreadToLLM card in `chrome://extensions/` and reload the test webpage.

---

## Git Workflow

### Trunk-Based Development

ThreadToLLM follows a **trunk-based development** model:

- The `master` branch is our canonical trunk and always represents releasable, passing code.
- Developers create short-lived feature branches branched directly off the latest `master`.
- Direct commits to `master` are prohibited; all changes land via Pull Requests.

### Branch Naming

Use descriptive branch names with appropriate prefixes:

- `feat/<topic>` (e.g., `feat/hacker-news-adapter`)
- `fix/<topic>` (e.g., `fix/shreddit-deleted-comment-score`)
- `docs/<topic>` (e.g., `docs/contributing-guide`)
- `refactor/<topic>` (e.g., `refactor/tree-traversal`)

### Pull Request Process

1. **Keep PRs focused**: Address a single feature, bug fix, or adapter per PR.
2. **Follow PR Template**: Fill out `.github/pull_request_template.md` thoroughly.
3. **Reference Issues**: Link the relevant issue in the PR description (e.g., `Closes #15`).
4. **Pass All Quality Gates**: Ensure `npm run check` passes 100% cleanly locally before opening the PR.
5. **No Merge Conflicts**: Rebase onto the latest `master` if the trunk has advanced.

---

## Conventional Commits

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification for all commit messages. This ensures a clean git log and automated changelog generation.

### Format

```
<type>(<scope>): <short imperative description> (#<issue>)
```

- **Type**: Must be one of:
  - `feat`: A new feature or platform adapter.
  - `fix`: A bug fix.
  - `refactor`: Code change that neither fixes a bug nor adds a feature.
  - `perf`: A code change that improves performance or token density.
  - `docs`: Documentation only changes.
  - `test`: Adding missing tests or correcting existing tests.
  - `chore`: Changes to build process, dependency updates, or governance files.
- **Scope**: The area of code affected (e.g., `core`, `adapter`, `ui`, `reddit`, `hn`, `extension`, `governance`).
- **Description**: Short, imperative, lowercase sentence without trailing period.
- **Ticket Reference**: Always reference the issue number at the end (`#<n>`).

### Examples

```bash
git commit -m "feat(adapter): add Hacker News platform adapter (#42)"
git commit -m "fix(ui): inherit action bar spacing and respect native theme (#33)"
git commit -m "refactor(core): optimize comment tree traversal depth calculations (#28)"
git commit -m "test(reddit): add fixture verification for deleted comment trees (#19)"
git commit -m "docs(governance): add contributing guide and issue templates (#15)"
```

---

## Architecture & Platform Adapter Guide

### The Three-Layer Modular Architecture

ThreadToLLM is organized into three decoupled layers per [ADR-0009](docs/adr/0009-three-layer-modular-seams.md):

```
src/
├── core/         # Pure TypeScript: Intermediate representation, noise filters, markdown serialization
├── adapters/     # Host platform DOM parsing (PlatformAdapter) and UI mounting (PlatformUI)
└── extension/    # Manifest V3 entry points, background service worker, SPA lifecycle manager, toast UI
```

#### Layer Responsibilities

1. **Core Layer (`src/core/`)**:
   - Platform-agnostic domain models (`ThreadDocument`, `OriginalPost`, `CommentNode`).
   - `FilterPipeline`: Prunes noise (empty comments, bots, excessive depth).
   - `MarkdownSerializer`: Formats filtered data into token-dense Markdown with YAML frontmatter.
   - **Crucial Rule**: Zero DOM or Chrome API dependencies. Must compile with `tsconfig.core.json` and run entirely in Node.js.
2. **Adapters Layer (`src/adapters/`)**:
   - Bridges a specific Host Platform's DOM structure with the canonical `ThreadDocument`.
   - Mounts the native `Thread Action` into the host platform's UI.
3. **Extension Layer (`src/extension/`)**:
   - Chrome Manifest V3 content scripts and service workers.
   - Observes SPA client-side navigations and mutations (`SPALifecycleManager`).
   - Dispatches keyboard shortcuts (`chrome.commands`) and manages micro-feedback toasts.

---

### Decoupled Contracts: PlatformAdapter vs PlatformUI

Per [ADR-0006](docs/adr/0006-decoupled-adapter-and-ui-contracts.md), data extraction and UI injection must remain separate interfaces:

```typescript
// src/adapters/adapter.interface.ts
export interface PlatformAdapter {
  extract(domRoot: HTMLElement | Document | Element): ThreadDocument;
}

// src/adapters/ui.interface.ts
export interface PlatformUI {
  mountAction(postElement: HTMLElement, domRoot?: HTMLElement | Document | Element): HTMLElement | null;
}
```

**Why decouple?**
- Headless testing: `PlatformAdapter` can be verified against static, exported HTML fixtures without needing simulated buttons, click listeners, or UI mocks.
- Resilience: If a host platform alters its UI action bar layout, the extraction engine continues functioning via global keyboard shortcuts (`Alt+Shift+C`) while the UI adapter is updated.

---

### Step-by-Step: Adding a New Host Platform

To add support for a new Host Platform (for example, Hacker News or Lobsters):

#### 1. Propose the Adapter
Open an issue using the [Platform Adapter Proposal](.github/ISSUE_TEMPLATE/adapter_proposal.yml) template to discuss DOM structure, example thread URLs, and action mount points.

#### 2. Create the Adapter Directory
Create a dedicated folder under `src/adapters/<platform>/`:
```
src/adapters/<platform>/
├── <platform>.adapter.ts          # Implements PlatformAdapter
├── <platform>.ui.ts               # Implements PlatformUI
├── extract-and-serialize.ts       # High-level testing and integration seam
└── index.ts                       # Barrel export
```

#### 3. Implement `PlatformAdapter`
Your adapter class must implement `PlatformAdapter` and inspect the host DOM to build a canonical `ThreadDocument`:

```typescript
import { PlatformAdapter } from '../adapter.interface';
import { ThreadDocument, OriginalPost, CommentNode } from '../../core';

export class NewPlatformAdapter implements PlatformAdapter {
  extract(domRoot: HTMLElement | Document | Element): ThreadDocument {
    // 1. Extract Original Post details
    const originalPost: OriginalPost = {
      id: '...',
      title: '...',
      author: '...',
      content: '...',
      url: '...',
      score: 0,
      createdAt: new Date().toISOString(),
    };

    // 2. Extract Comment Tree hierarchy recursively
    const comments: CommentNode[] = this.extractCommentTree(domRoot);

    // 3. Assemble and return ThreadDocument
    return {
      metadata: {
        source: 'new-platform',
        title: originalPost.title,
        url: window.location.href,
        author: originalPost.author,
        extractedCount: countComments(comments),
        isPartiallyLoaded: false,
      },
      originalPost,
      comments,
    };
  }
}
```

#### 4. Implement `PlatformUI`
Your UI class must implement `PlatformUI` to mount the native-styled `Thread Action` into the host platform interface:

```typescript
import { PlatformUI } from '../ui.interface';

export class NewPlatformUI implements PlatformUI {
  mountAction(postElement: HTMLElement, domRoot?: HTMLElement | Document | Element): HTMLElement | null {
    // 1. Locate the native action bar / button row
    const actionBar = postElement.querySelector('.action-bar');
    if (!actionBar || postElement.querySelector('.thread-to-llm-action')) {
      return null;
    }

    // 2. Create and style the button matching host platform design tokens
    const button = document.createElement('button');
    button.className = 'thread-to-llm-action';
    button.textContent = 'Copy for LLM';

    // 3. Attach click handler to trigger extraction, clipboard write, and micro-feedback
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.handleTrigger(postElement, domRoot, button);
    });

    actionBar.appendChild(button);
    return button;
  }
}
```

#### 5. Provide an Integration Seam
Expose an `extractAndSerialize` helper in `extract-and-serialize.ts` that wires your adapter to `FilterPipeline` and `MarkdownSerializer`.

#### 6. Export from Barrel
Re-export your new adapter in `src/adapters/<platform>/index.ts` and `src/adapters/index.ts`.

#### 7. Wire into Content Script & Manifest
- Add host platform domain matches to `manifest.json` (`host_permissions` and `content_scripts[].matches`).
- Update `src/extension/content.ts` to detect the host platform and initialize your `PlatformUI` and `SPALifecycleManager`.

---

### Coding Standards & Review Rules

Refer to [CODING_STANDARDS.md](CODING_STANDARDS.md) for architectural rules enforced during review:

1. **Pure Core**: `src/core/` must never import DOM globals or Chrome APIs.
2. **Account vs Content Deletion**:
   - A comment whose author is `[deleted]` is **not** deleted if its body text remains intact.
   - A comment is only marked `isDeleted: true` if its body content is purged (`[deleted]`, `[removed]`) or explicit deletion attributes are set.
3. **Preserve Deleted Placeholders**: Retain deleted comments that have active replies (`isDeleted: true`) so reply nesting remains valid. Prune childless deleted leaf comments.
4. **DOM-Availability Extraction**: Platform adapters must extract currently hydrated DOM elements. Do not speculate or assert on unhydrated host SPA state. The one exception is `isPartiallyLoaded: true`, which must be set only when an unclicked unexpanded-reply trigger is actually rendered inside the extraction root — never from a host comment-count discrepancy (ADR-0011).
5. **Host Platform Styling Fidelity**: Match host interactive tokens (`--color-neutral-content`, `currentColor`) rather than metadata/subtext tokens. Inherit existing margin tokens rather than assuming container flex gap.
6. **Single Dispatch Channel**: Extension global shortcuts (`chrome.commands`) must route through the background service worker. Do not bind redundant DOM `keydown` listeners in content scripts.

---

### Testing Practices

Every new feature or adapter requires automated tests:

1. **Static DOM Fixtures**:
   - Save realistic, captured HTML thread examples under `tests/fixtures/<platform>/`.
   - Parse fixtures at module scope or `beforeAll` scope rather than inside individual tests.
2. **DOM Test Environment**:
   - Files testing DOM extraction or UI mounting must include `// @vitest-environment happy-dom` at the very top of the test file.
   - Core unit tests run in the default Node environment.
3. **Integration & Seam Verification**:
   - Test the end-to-end extraction seam: verify input DOM fixture -> `ThreadDocument` -> filtered tree -> serialized Markdown.
   - Assert token density and YAML frontmatter output.

---

## Domain Vocabulary (GLOSSARY)

To maintain conceptual integrity across code, documentation, and issues, always adhere to the canonical terms defined in [GLOSSARY.md](GLOSSARY.md):

| Canonical Term | What It Means | Terms to Avoid |
| :--- | :--- | :--- |
| **Host Platform** | The third-party website hosting the thread (e.g., Reddit, Hacker News). | *Target site, vendor, provider* |
| **Original Post** | The initial submission or topic anchoring a discussion. | *Root post, main post, topic, submission* |
| **Thread Document** | The platform-agnostic intermediate representation of the thread. | *Thread object, parsed post, scraped data* |
| **Comment Tree** | The hierarchical tree of replies and sub-replies stemming from the OP. | *Reply chain, comment list, conversation thread* |
| **Hydrated Comment** | A comment element rendered into the host platform's client DOM. | *Visible comment, loaded comment, rendered node* |
| **Platform Adapter** | The module parsing the host DOM into a `ThreadDocument`. | *Scraper, parser, extractor, crawler* |
| **Filter Pipeline** | The sequence of filtering rules pruning noise from a `ThreadDocument`. | *Cleaner, sanitizer, pruner, trimmer* |
| **Markdown Serializer** | Formats the filtered `ThreadDocument` into token-dense Markdown. | *Formatter, exporter, printer* |
| **Thread Action** | The in-page button mounted into the host interface to copy Markdown. | *Copy button, floating button, extension trigger* |
| **Platform UI** | The module responsible for mounting the Thread Action. | *View binder, button injector, UI hook* |
| **Micro-Feedback** | Temporary visual state rendered on the Thread Action reflecting the outcome of a copy attempt (success or failure). | *Toast alert, popup badge, snackbar* |
| **Deleted Placeholder** | A redacted comment preserved in the tree solely to maintain reply hierarchy. | *Tombstone, ghost comment, empty node* |
| **Leaf Comment** | A comment node in the Comment Tree that has no replies. | *Terminal comment, end node, childless comment* |
