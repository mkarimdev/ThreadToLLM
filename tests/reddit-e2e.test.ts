// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';
import { extractAndSerialize } from '../src/adapters';

describe('extractAndSerialize (End-to-End Testing Seam)', () => {
  let textThreadRoot: HTMLDivElement;
  let linkPostRoot: HTMLDivElement;
  let sidebarWidgetsRoot: HTMLDivElement;
  let pendingPaginationRoot: HTMLDivElement;

  beforeAll(() => {
    textThreadRoot = document.createElement('div');
    textThreadRoot.innerHTML = `
      <shreddit-post
        id="t3_abc123"
        post-title="Modern Reddit Architecture Discussion"
        author="lead_architect"
        score="150"
        permalink="/r/webdev/comments/abc123/modern_reddit_architecture"
        created-timestamp="2026-11-15T10:00:00Z"
      >
        <div slot="text-body">
          <p>We are evaluating web components and custom elements for high-traffic media feeds.</p>
          <p>How are teams finding the DX and hydration performance?</p>
        </div>
      </shreddit-post>

      <div id="comment-tree">
        <!-- AutoModerator sticky: should be pruned by FilterPipeline -->
        <shreddit-comment thingid="t1_bot" author="AutoModerator" score="1" depth="0">
          <div slot="comment"><p>Welcome to r/webdev! Please follow subreddit rules.</p></div>
        </shreddit-comment>

        <!-- Top-level comment with nested replies and OP response -->
        <shreddit-comment thingid="t1_com1" author="frontend_dev" score="45" depth="0">
          <div slot="comment"><p>Web components provide great boundary isolation across large orgs.</p></div>
          <shreddit-comment thingid="t1_com1_1" author="lead_architect" score="20" depth="1" is-author="true">
            <div slot="comment"><p>Agreed, especially for cross-framework component sharing.</p></div>
            <shreddit-comment thingid="t1_com1_1_1" author="junior_eng" score="3" depth="2">
              <div slot="comment"><p>Did you run into any SSR hydration timing issues?</p></div>
              <!-- Depth tier 3 (hierarchical tier 4): retained under default full-depth retention -->
              <shreddit-comment thingid="t1_com1_1_1_1" author="lead_architect" score="2" depth="3" is-author="true">
                <div slot="comment"><p>Deep reply that exceeds depth limit.</p></div>
              </shreddit-comment>
            </shreddit-comment>
          </shreddit-comment>
        </shreddit-comment>

        <!-- Deleted parent with active reply: should retain [deleted] placeholder -->
        <shreddit-comment thingid="t1_del_parent" author="[deleted]" score="0" depth="0" deleted="true">
          <div slot="comment"><p>[deleted]</p></div>
          <shreddit-comment thingid="t1_del_child" author="helpful_reviewer" score="12" depth="1">
            <div slot="comment"><p>The original question asked about bundle sizes.</p></div>
          </shreddit-comment>
        </shreddit-comment>

        <!-- Orphaned deleted comment: should be completely pruned -->
        <shreddit-comment thingid="t1_del_orphan" author="[deleted]" score="-2" depth="0" deleted="true">
          <div slot="comment"><p>[deleted]</p></div>
        </shreddit-comment>

        <!-- Image/meme reply comment: verifies meme image extraction and no blank bullet -->
        <shreddit-comment thingid="t1_meme" author="amr3k" score="14" depth="0">
          <div slot="avatar">
            <shreddit-avatar>
              <faceplate-img src="https://styles.redditmedia.com/avatar_amr3k.png"></faceplate-img>
            </shreddit-avatar>
          </div>
          <div slot="comment">
            <img src="https://i.redd.it/architecture_meme.png" alt="Architecture meme" />
          </div>
        </shreddit-comment>
      </div>
    `;

    linkPostRoot = document.createElement('div');
    linkPostRoot.innerHTML = `
      <shreddit-post
        id="t3_link99"
        post-title="Official TypeScript 5.8 Release Notes"
        author="msft_announcer"
        score="500"
        content-href="https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/"
        permalink="/r/typescript/comments/link99/announcing_typescript_5_8"
      >
      </shreddit-post>
      <shreddit-comment thingid="c1" author="enthusiast" score="40" depth="0">
        <div slot="comment"><p>The performance improvements in 5.8 look substantial!</p></div>
      </shreddit-comment>
      <shreddit-comment-tree-action>
        <button>Load more comments</button>
      </shreddit-comment-tree-action>
    `;

    sidebarWidgetsRoot = document.createElement('div');
    sidebarWidgetsRoot.innerHTML = `
      <shreddit-post
        id="t3_side_e2e"
        post-title="E2E Thread with Sidebar Loaders"
        author="e2e_tester"
        score="75"
        comment-count="3"
        permalink="/r/webdev/comments/side_e2e"
      >
        <div slot="text-body"><p>Discussion body.</p></div>
      </shreddit-post>
      <div id="comment-tree">
        <shreddit-comment thingid="c1" author="user_a" score="10" depth="0">
          <div slot="comment"><p>Loaded single comment.</p></div>
        </shreddit-comment>
      </div>
      <aside>
        <faceplate-partial src="/svc/shreddit/sidebar/recommended"></faceplate-partial>
        <shreddit-async-loader src="/svc/shreddit/sidebar/trending"></shreddit-async-loader>
      </aside>
      <div slot="drawer">
        <faceplate-partial src="/svc/shreddit/user-drawer"></faceplate-partial>
      </div>
    `;

    pendingPaginationRoot = document.createElement('div');
    pendingPaginationRoot.innerHTML = `
      <shreddit-post
        id="t3_pending_e2e"
        post-title="E2E Thread with Pending Pagination"
        author="e2e_tester"
        score="80"
        comment-count="2"
        permalink="/r/webdev/comments/pending_e2e"
      >
        <div slot="text-body"><p>Discussion body.</p></div>
      </shreddit-post>
      <div id="comment-tree">
        <shreddit-comment thingid="c1" author="user_a" score="10" depth="0">
          <div slot="comment"><p>First comment.</p></div>
        </shreddit-comment>
        <shreddit-more-comments count="5"></shreddit-more-comments>
      </div>
    `;
  });

  it('end-to-end: extracts DOM, filters noise, and serializes into expected token-dense Markdown', async () => {
    const markdown = await extractAndSerialize(textThreadRoot);

    // Frontmatter validation
    expect(markdown).toContain('---');
    expect(markdown).toContain('source: reddit');
    expect(markdown).toContain('title: "Modern Reddit Architecture Discussion"');
    expect(markdown).toContain('url: "https://reddit.com/r/webdev/comments/abc123/modern_reddit_architecture"');
    expect(markdown).toContain('author: lead_architect');
    expect(markdown).not.toContain('isPartiallyLoaded');

    // Post content validation
    expect(markdown).toContain('# Modern Reddit Architecture Discussion');
    expect(markdown).toContain('We are evaluating web components and custom elements for high-traffic media feeds.');
    expect(markdown).toContain('How are teams finding the DX and hydration performance?');

    // AutoModerator pruned
    expect(markdown).not.toContain('AutoModerator');
    expect(markdown).not.toContain('Welcome to r/webdev');

    // Valid comments and OP attribution
    expect(markdown).toContain('- **[+45] frontend_dev**: Web components provide great boundary isolation across large orgs.');
    expect(markdown).toContain('  - **[+20] lead_architect (OP)**: Agreed, especially for cross-framework component sharing.');
    expect(markdown).toContain('    - **[+3] junior_eng**: Did you run into any SSR hydration timing issues?');

    // Depth tier 3 retained under default full-depth retention with OP badge
    expect(markdown).toContain('      - **[+2] lead_architect (OP)**: Deep reply that exceeds depth limit.');

    // Deleted parent placeholder retained with reply
    expect(markdown).toContain('- **[0] [deleted]**: [deleted]');
    expect(markdown).toContain('  - **[+12] helpful_reviewer**: The original question asked about bundle sizes.');

    // Orphaned deleted comment pruned
    expect(markdown).not.toContain('[-2]');

    // Comment media extraction: meme image extracted as body, avoiding empty bullet point
    expect(markdown).toContain('- **[+14] amr3k**: https://i.redd.it/architecture_meme.png');
    expect(markdown).not.toContain('- **[+14] amr3k**: \n');
    expect(markdown).not.toContain('https://styles.redditmedia.com/avatar_amr3k.png');
  });

  it('end-to-end: handles non-text link submission and extracts available elements', async () => {
    const markdown = await extractAndSerialize(linkPostRoot);

    expect(markdown).toContain('source: reddit');
    expect(markdown).toContain('title: "Official TypeScript 5.8 Release Notes"');
    expect(markdown).toContain('author: msft_announcer');
    expect(markdown).not.toContain('isPartiallyLoaded');
    expect(markdown).toContain('https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/');
    expect(markdown).toContain('- **[+40] enthusiast**: The performance improvements in 5.8 look substantial!');
  });

  it('end-to-end: ignores global page widgets and tolerance margin, emitting clean fully loaded frontmatter', async () => {
    const markdown = await extractAndSerialize(sidebarWidgetsRoot);

    expect(markdown).toContain('source: reddit');
    expect(markdown).toContain('title: "E2E Thread with Sidebar Loaders"');
    expect(markdown).toContain('author: e2e_tester');
    expect(markdown).not.toContain('isPartiallyLoaded');
    expect(markdown).toContain('- **[+10] user_a**: Loaded single comment.');
  });

  it('end-to-end: extracts all available comments without partial loading flag', async () => {
    const markdown = await extractAndSerialize(pendingPaginationRoot);

    expect(markdown).toContain('source: reddit');
    expect(markdown).toContain('title: "E2E Thread with Pending Pagination"');
    expect(markdown).toContain('author: e2e_tester');
    expect(markdown).not.toContain('isPartiallyLoaded');
    expect(markdown).toContain('- **[+10] user_a**: First comment.');
  });
});
