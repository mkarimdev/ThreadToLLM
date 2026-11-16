// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';
import { RedditAdapter } from '../src/adapters/reddit/reddit.adapter';

describe('RedditAdapter', () => {
  let adapter: RedditAdapter;

  // Pre-parsed DOM fixtures scoped to beforeAll (CODING_STANDARDS.md)
  let standardPostFixture: HTMLDivElement;
  let linkPostFixture: HTMLDivElement;
  let mediaEmbedFixture: HTMLDivElement;
  let textAndMediaFixture: HTMLDivElement;
  let galleryFixture: HTMLDivElement;
  let nestedCommentFixture: HTMLDivElement;
  let flatCommentFixture: HTMLDivElement;
  let deletedUserActiveContentFixture: HTMLDivElement;
  let partialTreeActionFixture: HTMLDivElement;
  let partialFaceplateFixture: HTMLDivElement;
  let partialCommentCountFixture: HTMLDivElement;
  let fullyHydratedFixture: HTMLDivElement;
  let sidebarAndDrawerWidgetsFixture: HTMLDivElement;
  let toleranceMarginSmallDiscrepancyFixture: HTMLDivElement;
  let exceedsToleranceMarginFixture: HTMLDivElement;
  let toleranceWithinMarginWithPaginationTriggerFixture: HTMLDivElement;
  let commentTreeScopedAsyncLoaderFixture: HTMLDivElement;
  let commentChildLoaderFixture: HTMLDivElement;
  let unclickedPaginationButtonFixture: HTMLDivElement;
  let commentMemeOnlyFixture: HTMLDivElement;
  let commentTextAndMediaFixture: HTMLDivElement;
  let commentWithAvatarFixture: HTMLDivElement;
  let commentGifEmbedFixture: HTMLDivElement;
  let commentMediaTreeIsolationFixture: HTMLDivElement;
  let commentMultipleMediaFixture: HTMLDivElement;
  let commentActionRowIconsFixture: HTMLDivElement;

  beforeAll(() => {
    adapter = new RedditAdapter();

    standardPostFixture = document.createElement('div');
    standardPostFixture.innerHTML = `
      <shreddit-post
        id="t3_xyz123"
        post-title="Ask Reddit: What is your favorite TypeScript pattern?"
        author="ts_guru"
        score="84"
        permalink="/r/typescript/comments/xyz123/favorite_pattern"
        created-timestamp="2026-11-15T12:00:00Z"
      >
        <div slot="text-body">
          <p>Curious what architectural patterns have saved you the most debugging time in large codebases.</p>
          <p>Personally, I love discriminated unions for domain state modeling.</p>
        </div>
      </shreddit-post>
    `;

    linkPostFixture = document.createElement('div');
    linkPostFixture.innerHTML = `
      <shreddit-post
        id="t3_link1"
        post-title="Show HN: A new tool"
        author="tech_user"
        score="120"
        content-href="https://news.ycombinator.com/item?id=12345"
        permalink="/r/programming/comments/link1/show_hn"
      >
      </shreddit-post>
    `;

    mediaEmbedFixture = document.createElement('div');
    mediaEmbedFixture.innerHTML = `
      <shreddit-post
        id="t3_img1"
        post-title="Check out my workspace setup"
        author="designer_dev"
        score="350"
        permalink="/r/battlestations/comments/img1/workspace"
      >
        <div slot="content">
          <img src="https://i.redd.it/desk_setup.png" alt="Desk setup" />
        </div>
      </shreddit-post>
    `;

    textAndMediaFixture = document.createElement('div');
    textAndMediaFixture.innerHTML = `
      <shreddit-post
        id="t3_both1"
        post-title="Post with text and outbound link"
        author="writer_dev"
        score="50"
        content-href="https://example.com/source-doc"
        permalink="/r/technology/comments/both1"
      >
        <div slot="text-body">
          <p>Here is my detailed analysis of the announcement.</p>
        </div>
      </shreddit-post>
    `;

    galleryFixture = document.createElement('div');
    galleryFixture.innerHTML = `
      <shreddit-post
        id="t3_gallery1"
        post-title="Multiple gallery photos"
        author="photographer"
        score="80"
        permalink="/r/pics/comments/gallery1"
      >
        <div slot="content">
          <img src="https://i.redd.it/photo1.png" />
          <img src="https://i.redd.it/photo2.png" />
        </div>
      </shreddit-post>
    `;

    nestedCommentFixture = document.createElement('div');
    nestedCommentFixture.innerHTML = `
      <shreddit-post
        id="t3_xyz123"
        post-title="Ask Reddit: What is your favorite TypeScript pattern?"
        author="ts_guru"
        score="84"
        permalink="/r/typescript/comments/xyz123/favorite_pattern"
      >
        <div slot="text-body"><p>Post text</p></div>
      </shreddit-post>
      <div id="comment-tree">
        <shreddit-comment
          thingid="t1_c1"
          author="dev_alex"
          score="84"
          depth="0"
        >
          <div slot="comment">
            <p>Branded types for domain IDs! Prevents passing a UserId where an OrderId is expected.</p>
          </div>
          <shreddit-comment
            thingid="t1_c1_1"
            author="ts_guru"
            score="32"
            depth="1"
            is-author="true"
          >
            <div slot="comment">
              <p>Completely agree. Zero runtime cost with total compile-time safety.</p>
            </div>
            <shreddit-comment
              thingid="t1_c1_1_1"
              author="curious_junior"
              score="5"
              depth="2"
            >
              <div slot="comment">
                <p>Does this work well with JSON serialization though?</p>
              </div>
            </shreddit-comment>
          </shreddit-comment>
        </shreddit-comment>
        <shreddit-comment
          thingid="t1_c2"
          author="[deleted]"
          score="0"
          depth="0"
          deleted="true"
        >
          <div slot="comment">
            <p>[deleted]</p>
          </div>
          <shreddit-comment
            thingid="t1_c2_1"
            author="helpful_dev"
            score="19"
            depth="1"
          >
            <div slot="comment">
              <p>To answer the deleted question: yes, satisfies operator solves this in TS 4.9+.</p>
            </div>
          </shreddit-comment>
        </shreddit-comment>
      </div>
    `;

    flatCommentFixture = document.createElement('div');
    flatCommentFixture.innerHTML = `
      <shreddit-post id="t3_1" post-title="Test Post" author="alice" permalink="/r/test/comments/1">
      </shreddit-post>
      <shreddit-comment thingid="c1" author="bob" score="10" depth="0">
        <div slot="comment"><p>Top comment</p></div>
      </shreddit-comment>
      <shreddit-comment thingid="c2" author="charlie" score="5" depth="1">
        <div slot="comment"><p>Reply to top comment</p></div>
      </shreddit-comment>
      <shreddit-comment thingid="c3" author="dave" score="2" depth="0">
        <div slot="comment"><p>Another top comment</p></div>
      </shreddit-comment>
    `;

    deletedUserActiveContentFixture = document.createElement('div');
    deletedUserActiveContentFixture.innerHTML = `
      <shreddit-post id="t3_del_user" post-title="Post" author="op" permalink="/r/test/comments/del">
      </shreddit-post>
      <shreddit-comment thingid="c_valid" author="[deleted]" score="15" depth="0">
        <div slot="comment"><p>This comment was written by an account that deleted their profile, but content remains valid.</p></div>
      </shreddit-comment>
    `;

    partialTreeActionFixture = document.createElement('div');
    partialTreeActionFixture.innerHTML = `
      <shreddit-post id="t3_part1" post-title="Post" author="alice" permalink="/r/test/comments/1">
      </shreddit-post>
      <shreddit-comment thingid="c1" author="bob" score="5" depth="0">
        <div slot="comment"><p>Loaded comment</p></div>
      </shreddit-comment>
      <shreddit-comment-tree-action>
        <button>View 15 more replies</button>
      </shreddit-comment-tree-action>
    `;

    partialFaceplateFixture = document.createElement('div');
    partialFaceplateFixture.innerHTML = `
      <shreddit-post id="t3_part2" post-title="Post" author="alice" permalink="/r/test/comments/2">
      </shreddit-post>
      <shreddit-comment thingid="c1" author="bob" score="5" depth="0">
        <div slot="comment"><p>Loaded comment</p></div>
      </shreddit-comment>
      <faceplate-partial src="/svc/shreddit/comments/more"></faceplate-partial>
    `;

    partialCommentCountFixture = document.createElement('div');
    partialCommentCountFixture.innerHTML = `
      <shreddit-post id="t3_part3" post-title="Post" author="alice" permalink="/r/test/comments/3" comment-count="45">
      </shreddit-post>
      <shreddit-comment thingid="c1" author="bob" score="5" depth="0">
        <div slot="comment"><p>Loaded comment</p></div>
      </shreddit-comment>
    `;

    fullyHydratedFixture = document.createElement('div');
    fullyHydratedFixture.innerHTML = `
      <shreddit-post id="t3_full" post-title="Post" author="alice" permalink="/r/test/comments/4" comment-count="1">
      </shreddit-post>
      <shreddit-comment thingid="c1" author="bob" score="5" depth="0">
        <div slot="comment"><p>Only comment</p></div>
      </shreddit-comment>
    `;

    sidebarAndDrawerWidgetsFixture = document.createElement('div');
    sidebarAndDrawerWidgetsFixture.innerHTML = `
      <shreddit-post id="t3_side" post-title="Post with sidebar widgets" author="alice" permalink="/r/test/comments/side" comment-count="2">
      </shreddit-post>
      <div id="comment-tree">
        <shreddit-comment thingid="c1" author="bob" score="5" depth="0">
          <div slot="comment"><p>First comment</p></div>
        </shreddit-comment>
        <shreddit-comment thingid="c2" author="charlie" score="3" depth="1">
          <div slot="comment"><p>Reply comment</p></div>
        </shreddit-comment>
      </div>
      <aside>
        <faceplate-partial src="/svc/shreddit/sidebar/recommended-communities"></faceplate-partial>
        <shreddit-async-loader src="/svc/shreddit/sidebar/recent-posts"></shreddit-async-loader>
      </aside>
      <div slot="drawer">
        <faceplate-partial src="/svc/shreddit/user-profile-drawer"></faceplate-partial>
        <shreddit-async-loader src="/svc/shreddit/notifications"></shreddit-async-loader>
      </div>
    `;

    toleranceMarginSmallDiscrepancyFixture = document.createElement('div');
    toleranceMarginSmallDiscrepancyFixture.innerHTML = `
      <shreddit-post id="t3_tol1" post-title="Post with 2 missing phantom comments" author="alice" permalink="/r/test/comments/tol1" comment-count="4">
      </shreddit-post>
      <div id="comment-tree">
        <shreddit-comment thingid="c1" author="bob" score="5" depth="0">
          <div slot="comment"><p>First comment</p></div>
        </shreddit-comment>
        <shreddit-comment thingid="c2" author="charlie" score="3" depth="0">
          <div slot="comment"><p>Second comment</p></div>
        </shreddit-comment>
      </div>
    `;

    exceedsToleranceMarginFixture = document.createElement('div');
    exceedsToleranceMarginFixture.innerHTML = `
      <shreddit-post id="t3_tol2" post-title="Post with 3 missing comments" author="alice" permalink="/r/test/comments/tol2" comment-count="5">
      </shreddit-post>
      <div id="comment-tree">
        <shreddit-comment thingid="c1" author="bob" score="5" depth="0">
          <div slot="comment"><p>First comment</p></div>
        </shreddit-comment>
        <shreddit-comment thingid="c2" author="charlie" score="3" depth="0">
          <div slot="comment"><p>Second comment</p></div>
        </shreddit-comment>
      </div>
    `;

    toleranceWithinMarginWithPaginationTriggerFixture = document.createElement('div');
    toleranceWithinMarginWithPaginationTriggerFixture.innerHTML = `
      <shreddit-post id="t3_tol3" post-title="Post with pagination trigger within count tolerance" author="alice" permalink="/r/test/comments/tol3" comment-count="3">
      </shreddit-post>
      <div id="comment-tree">
        <shreddit-comment thingid="c1" author="bob" score="5" depth="0">
          <div slot="comment"><p>First comment</p></div>
        </shreddit-comment>
        <shreddit-comment thingid="c2" author="charlie" score="3" depth="0">
          <div slot="comment"><p>Second comment</p></div>
        </shreddit-comment>
        <shreddit-more-comments count="1"></shreddit-more-comments>
      </div>
    `;

    commentTreeScopedAsyncLoaderFixture = document.createElement('div');
    commentTreeScopedAsyncLoaderFixture.innerHTML = `
      <shreddit-post id="t3_loader1" post-title="Post with loader in comment-tree" author="alice" permalink="/r/test/comments/loader1" comment-count="1">
      </shreddit-post>
      <div id="comment-tree">
        <shreddit-comment thingid="c1" author="bob" score="5" depth="0">
          <div slot="comment"><p>First comment</p></div>
        </shreddit-comment>
        <shreddit-async-loader></shreddit-async-loader>
      </div>
    `;

    commentChildLoaderFixture = document.createElement('div');
    commentChildLoaderFixture.innerHTML = `
      <shreddit-post id="t3_loader2" post-title="Post with loader inside comment" author="alice" permalink="/r/test/comments/loader2" comment-count="1">
      </shreddit-post>
      <div id="comment-tree">
        <shreddit-comment thingid="c1" author="bob" score="5" depth="0">
          <div slot="comment"><p>First comment</p></div>
          <shreddit-loading></shreddit-loading>
        </shreddit-comment>
      </div>
    `;

    unclickedPaginationButtonFixture = document.createElement('div');
    unclickedPaginationButtonFixture.innerHTML = `
      <shreddit-post id="t3_btn" post-title="Post with unclicked pagination button" author="alice" permalink="/r/test/comments/btn" comment-count="2">
      </shreddit-post>
      <div id="comment-tree">
        <shreddit-comment thingid="c1" author="bob" score="5" depth="0">
          <div slot="comment"><p>First comment</p></div>
        </shreddit-comment>
        <button aria-label="Load more comments">View 10 more replies</button>
      </div>
    `;

    commentMemeOnlyFixture = document.createElement('div');
    commentMemeOnlyFixture.innerHTML = `
      <shreddit-post id="t3_meme_post" post-title="Meme Thread" author="op_user" permalink="/r/memes/comments/1">
      </shreddit-post>
      <shreddit-comment thingid="c_meme_only" author="amr3k" score="14" depth="0">
        <div slot="comment">
          <img src="https://i.redd.it/meme123.jpg" alt="funny meme" />
        </div>
      </shreddit-comment>
    `;

    commentTextAndMediaFixture = document.createElement('div');
    commentTextAndMediaFixture.innerHTML = `
      <shreddit-post id="t3_text_media_post" post-title="Tech Thread" author="op_user" permalink="/r/tech/comments/2">
      </shreddit-post>
      <shreddit-comment thingid="c_text_media" author="architect_bob" score="25" depth="0">
        <div slot="comment">
          <p>Here is the architectural diagram for the new flow.</p>
          <faceplate-img src="https://preview.redd.it/diagram.png"></faceplate-img>
        </div>
      </shreddit-comment>
    `;

    commentWithAvatarFixture = document.createElement('div');
    commentWithAvatarFixture.innerHTML = `
      <shreddit-post id="t3_avatar_post" post-title="Avatar Thread" author="op_user" permalink="/r/tech/comments/3">
      </shreddit-post>
      <shreddit-comment thingid="c_avatar_only" author="avatar_fan" score="7" depth="0">
        <div slot="avatar">
          <shreddit-avatar>
            <faceplate-img src="https://styles.redditmedia.com/t5_xyz/avatar.png"></faceplate-img>
          </shreddit-avatar>
        </div>
        <div slot="comment">
          <p>Valid comment text without any media attached.</p>
        </div>
      </shreddit-comment>
    `;

    commentGifEmbedFixture = document.createElement('div');
    commentGifEmbedFixture.innerHTML = `
      <shreddit-post id="t3_gif_post" post-title="GIF Thread" author="op_user" permalink="/r/reactions/comments/4">
      </shreddit-post>
      <shreddit-comment thingid="c_gif" author="reaction_poster" score="19" depth="0">
        <shreddit-media-lightbox-listener>
          <img src="https://media.giphy.com/media/xyz123/giphy.gif" />
        </shreddit-media-lightbox-listener>
      </shreddit-comment>
    `;

    commentMediaTreeIsolationFixture = document.createElement('div');
    commentMediaTreeIsolationFixture.innerHTML = `
      <shreddit-post id="t3_tree_post" post-title="Tree Thread" author="op_user" permalink="/r/tree/comments/5">
      </shreddit-post>
      <shreddit-comment thingid="c_parent" author="parent_author" score="30" depth="0">
        <div slot="comment">
          <p>Parent comment without images.</p>
        </div>
        <shreddit-comment thingid="c_child" author="child_author" score="12" depth="1">
          <div slot="comment">
            <img src="https://i.redd.it/child_meme.png" />
          </div>
        </shreddit-comment>
      </shreddit-comment>
    `;

    commentMultipleMediaFixture = document.createElement('div');
    commentMultipleMediaFixture.innerHTML = `
      <shreddit-post id="t3_multi_post" post-title="Multi Media Thread" author="op_user" permalink="/r/gallery/comments/6">
      </shreddit-post>
      <shreddit-comment thingid="c_multi" author="gallery_commenter" score="11" depth="0">
        <div slot="comment">
          <p>Double reaction:</p>
          <img src="https://i.redd.it/img1.png" />
          <faceplate-img src="https://i.redd.it/img2.png"></faceplate-img>
        </div>
      </shreddit-comment>
    `;

    commentActionRowIconsFixture = document.createElement('div');
    commentActionRowIconsFixture.innerHTML = `
      <shreddit-post id="t3_action_post" post-title="Action Post" author="op_user" permalink="/r/action/comments/7">
      </shreddit-post>
      <shreddit-comment thingid="c_actions" author="action_user" score="5" depth="0">
        <div slot="comment">
          <p>Comment body text.</p>
        </div>
        <shreddit-comment-action-row>
          <button><img src="https://reddit.com/icons/upvote.svg" /></button>
          <button><faceplate-img src="https://reddit.com/icons/share.svg"></faceplate-img></button>
        </shreddit-comment-action-row>
      </shreddit-comment>
    `;
  });

  describe('Post metadata extraction', () => {
    it('extracts post metadata, score, author, and text body from <shreddit-post>', () => {
      const doc = adapter.extract(standardPostFixture);

      expect(doc.metadata.source).toBe('reddit');
      expect(doc.metadata.title).toBe('Ask Reddit: What is your favorite TypeScript pattern?');
      expect(doc.metadata.url).toBe('https://reddit.com/r/typescript/comments/xyz123/favorite_pattern');
      expect(doc.metadata.author).toBe('ts_guru');
      expect(doc.metadata.extractedCount).toBe(0);
      expect(doc.metadata.isPartiallyLoaded).toBe(false);

      expect(doc.originalPost.id).toBe('t3_xyz123');
      expect(doc.originalPost.title).toBe('Ask Reddit: What is your favorite TypeScript pattern?');
      expect(doc.originalPost.author).toBe('ts_guru');
      expect(doc.originalPost.score).toBe(84);
      expect(doc.originalPost.content).toBe(
        'Curious what architectural patterns have saved you the most debugging time in large codebases.\n\nPersonally, I love discriminated unions for domain state modeling.'
      );
      expect(doc.originalPost.createdAt).toBe('2026-11-15T12:00:00Z');
      expect(doc.comments).toEqual([]);
    });

    it('extracts external target URL for link submissions when text body is absent', () => {
      const doc = adapter.extract(linkPostFixture);

      expect(doc.metadata.url).toBe('https://reddit.com/r/programming/comments/link1/show_hn');
      expect(doc.originalPost.url).toBe('https://news.ycombinator.com/item?id=12345');
      expect(doc.originalPost.content).toBe('https://news.ycombinator.com/item?id=12345');
    });

    it('extracts media embed URL as fallback content for image or video submissions', () => {
      const doc = adapter.extract(mediaEmbedFixture);

      expect(doc.originalPost.url).toBe('https://i.redd.it/desk_setup.png');
      expect(doc.originalPost.content).toBe('https://i.redd.it/desk_setup.png');
    });

    it('retains both text body and external URL when both exist', () => {
      const doc = adapter.extract(textAndMediaFixture);

      expect(doc.originalPost.url).toBe('https://example.com/source-doc');
      expect(doc.originalPost.content).toContain('Here is my detailed analysis of the announcement.');
      expect(doc.originalPost.content).toContain('https://example.com/source-doc');
    });

    it('handles image galleries by extracting multiple image URLs', () => {
      const doc = adapter.extract(galleryFixture);

      expect(doc.originalPost.content).toContain('https://i.redd.it/photo1.png');
      expect(doc.originalPost.content).toContain('https://i.redd.it/photo2.png');
    });
  });

  describe('Comment tree traversal and extraction', () => {
    it('traverses nested <shreddit-comment> elements and builds canonical CommentTree', () => {
      const doc = adapter.extract(nestedCommentFixture);

      expect(doc.metadata.extractedCount).toBe(5);
      expect(doc.comments).toHaveLength(2);

      // Comment 1
      const c1 = doc.comments[0];
      expect(c1.id).toBe('t1_c1');
      expect(c1.author).toBe('dev_alex');
      expect(c1.score).toBe(84);
      expect(c1.content).toBe('Branded types for domain IDs! Prevents passing a UserId where an OrderId is expected.');
      expect(c1.depth).toBe(0);
      expect(c1.isOp).toBeFalsy();
      expect(c1.replies).toHaveLength(1);

      // Child 1.1 (OP)
      const c1_1 = c1.replies[0];
      expect(c1_1.id).toBe('t1_c1_1');
      expect(c1_1.author).toBe('ts_guru');
      expect(c1_1.score).toBe(32);
      expect(c1_1.isOp).toBe(true);
      expect(c1_1.depth).toBe(1);
      expect(c1_1.replies).toHaveLength(1);

      // Child 1.1.1
      const c1_1_1 = c1_1.replies[0];
      expect(c1_1_1.id).toBe('t1_c1_1_1');
      expect(c1_1_1.author).toBe('curious_junior');
      expect(c1_1_1.score).toBe(5);
      expect(c1_1_1.depth).toBe(2);
      expect(c1_1_1.replies).toHaveLength(0);

      // Comment 2 (Deleted parent)
      const c2 = doc.comments[1];
      expect(c2.id).toBe('t1_c2');
      expect(c2.author).toBe('[deleted]');
      expect(c2.isDeleted).toBe(true);
      expect(c2.score).toBe(0);
      expect(c2.replies).toHaveLength(1);

      // Child 2.1
      const c2_1 = c2.replies[0];
      expect(c2_1.id).toBe('t1_c2_1');
      expect(c2_1.author).toBe('helpful_dev');
      expect(c2_1.score).toBe(19);
      expect(c2_1.depth).toBe(1);
    });

    it('builds canonical CommentTree when <shreddit-comment> elements are flat siblings with depth attributes', () => {
      const doc = adapter.extract(flatCommentFixture);

      expect(doc.metadata.extractedCount).toBe(3);
      expect(doc.comments).toHaveLength(2);
      expect(doc.comments[0].id).toBe('c1');
      expect(doc.comments[0].replies).toHaveLength(1);
      expect(doc.comments[0].replies[0].id).toBe('c2');
      expect(doc.comments[1].id).toBe('c3');
      expect(doc.comments[1].replies).toHaveLength(0);
    });

    it('preserves comment content when user account is [deleted] but content is not deleted', () => {
      const doc = adapter.extract(deletedUserActiveContentFixture);

      expect(doc.comments).toHaveLength(1);
      expect(doc.comments[0].author).toBe('[deleted]');
      expect(doc.comments[0].isDeleted).toBeFalsy();
      expect(doc.comments[0].content).toBe(
        'This comment was written by an account that deleted their profile, but content remains valid.'
      );
    });
  });

  describe('Partial loading detection', () => {
    it('sets isPartiallyLoaded: true when <shreddit-comment-tree-action> is present', () => {
      const doc = adapter.extract(partialTreeActionFixture);

      expect(doc.metadata.isPartiallyLoaded).toBe(true);
      expect(doc.metadata.extractedCount).toBe(1);
    });

    it('sets isPartiallyLoaded: true when <faceplate-partial> or <shreddit-async-loader> is present', () => {
      const doc = adapter.extract(partialFaceplateFixture);

      expect(doc.metadata.isPartiallyLoaded).toBe(true);
    });

    it('sets isPartiallyLoaded: true when <shreddit-post> comment-count exceeds extracted count', () => {
      const doc = adapter.extract(partialCommentCountFixture);

      expect(doc.metadata.extractedCount).toBe(1);
      expect(doc.metadata.isPartiallyLoaded).toBe(true);
    });

    it('sets isPartiallyLoaded: false when thread has no unhydrated elements', () => {
      const doc = adapter.extract(fullyHydratedFixture);

      expect(doc.metadata.extractedCount).toBe(1);
      expect(doc.metadata.isPartiallyLoaded).toBe(false);
    });

    it('sets isPartiallyLoaded: false when unhydrated loaders are only in global sidebar or user drawer', () => {
      const doc = adapter.extract(sidebarAndDrawerWidgetsFixture);

      expect(doc.metadata.extractedCount).toBe(2);
      expect(doc.metadata.isPartiallyLoaded).toBe(false);
    });

    it('sets isPartiallyLoaded: false when comment-count discrepancy is within tolerance margin (<= 2 missing)', () => {
      const doc = adapter.extract(toleranceMarginSmallDiscrepancyFixture);

      expect(doc.metadata.extractedCount).toBe(2);
      expect(doc.metadata.isPartiallyLoaded).toBe(false);
    });

    it('sets isPartiallyLoaded: true when comment-count discrepancy exceeds tolerance margin (> 2 missing)', () => {
      const doc = adapter.extract(exceedsToleranceMarginFixture);

      expect(doc.metadata.extractedCount).toBe(2);
      expect(doc.metadata.isPartiallyLoaded).toBe(true);
    });

    it('sets isPartiallyLoaded: true when comment pagination trigger is present even if count is within tolerance', () => {
      const doc = adapter.extract(toleranceWithinMarginWithPaginationTriggerFixture);

      expect(doc.metadata.extractedCount).toBe(2);
      expect(doc.metadata.isPartiallyLoaded).toBe(true);
    });

    it('sets isPartiallyLoaded: true when an unhydrated loader exists inside #comment-tree', () => {
      const doc = adapter.extract(commentTreeScopedAsyncLoaderFixture);

      expect(doc.metadata.extractedCount).toBe(1);
      expect(doc.metadata.isPartiallyLoaded).toBe(true);
    });

    it('sets isPartiallyLoaded: true when an unhydrated loader exists inside a <shreddit-comment>', () => {
      const doc = adapter.extract(commentChildLoaderFixture);

      expect(doc.metadata.extractedCount).toBe(1);
      expect(doc.metadata.isPartiallyLoaded).toBe(true);
    });

    it('sets isPartiallyLoaded: true when an unclicked pagination button exists in comment tree', () => {
      const doc = adapter.extract(unclickedPaginationButtonFixture);

      expect(doc.metadata.extractedCount).toBe(1);
      expect(doc.metadata.isPartiallyLoaded).toBe(true);
    });
  });

  describe('Comment media and meme image extraction', () => {
    it('formats image URL as comment content when comment contains only an image (meme reply)', () => {
      const doc = adapter.extract(commentMemeOnlyFixture);

      expect(doc.comments).toHaveLength(1);
      expect(doc.comments[0].author).toBe('amr3k');
      expect(doc.comments[0].score).toBe(14);
      expect(doc.comments[0].content).toBe('https://i.redd.it/meme123.jpg');
    });

    it('appends image URL after text block when comment contains both text and an embedded image', () => {
      const doc = adapter.extract(commentTextAndMediaFixture);

      expect(doc.comments).toHaveLength(1);
      expect(doc.comments[0].author).toBe('architect_bob');
      expect(doc.comments[0].content).toBe(
        'Here is the architectural diagram for the new flow.\n\nhttps://preview.redd.it/diagram.png'
      );
    });

    it('strictly ignores author avatars and never extracts avatar URLs as comment media', () => {
      const doc = adapter.extract(commentWithAvatarFixture);

      expect(doc.comments).toHaveLength(1);
      expect(doc.comments[0].author).toBe('avatar_fan');
      expect(doc.comments[0].content).toBe('Valid comment text without any media attached.');
      expect(doc.comments[0].content).not.toContain('avatar.png');
    });

    it('extracts GIF embeds from <shreddit-media-lightbox-listener> or media wrappers', () => {
      const doc = adapter.extract(commentGifEmbedFixture);

      expect(doc.comments).toHaveLength(1);
      expect(doc.comments[0].author).toBe('reaction_poster');
      expect(doc.comments[0].content).toBe('https://media.giphy.com/media/xyz123/giphy.gif');
    });

    it('isolates comment media to the containing comment and does not leak child media into parent', () => {
      const doc = adapter.extract(commentMediaTreeIsolationFixture);

      expect(doc.comments).toHaveLength(1);
      expect(doc.comments[0].content).toBe('Parent comment without images.');
      expect(doc.comments[0].replies).toHaveLength(1);
      expect(doc.comments[0].replies[0].content).toBe('https://i.redd.it/child_meme.png');
    });

    it('extracts multiple media URLs and joins them when multiple images exist in a comment', () => {
      const doc = adapter.extract(commentMultipleMediaFixture);

      expect(doc.comments).toHaveLength(1);
      expect(doc.comments[0].content).toContain('Double reaction:');
      expect(doc.comments[0].content).toContain('https://i.redd.it/img1.png');
      expect(doc.comments[0].content).toContain('https://i.redd.it/img2.png');
    });

    it('ignores action row icons, vote buttons, and share icons inside <shreddit-comment>', () => {
      const doc = adapter.extract(commentActionRowIconsFixture);

      expect(doc.comments).toHaveLength(1);
      expect(doc.comments[0].content).toBe('Comment body text.');
      expect(doc.comments[0].content).not.toContain('upvote.svg');
      expect(doc.comments[0].content).not.toContain('share.svg');
    });
  });
});
