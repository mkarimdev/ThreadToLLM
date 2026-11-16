/**
 * Real-world Modern Reddit DOM fixture.
 * Captures authentic web-component internals:
 * - Nested <shreddit-comment> elements containing author hovercard async-loaders
 * - Embedded comment meme images and gifs
 * - Native action bar with <shreddit-post-share-button> and custom spacing
 */

export function createRealRedditThreadFixture(): HTMLDivElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <shreddit-post
      id="t3_realworld1"
      post-title="Gemini blocked me from security auditing my OWN site?"
      author="Accurate-Skill3425"
      score="25"
      comment-count="26"
      permalink="/r/google_antigravity/comments/1xrdu46/gemini_blocked_me"
    >
      <div slot="text-body">
        <p>I was running the security audit skill when Gemini Flash hit a safety block.</p>
      </div>

      <div slot="action-bar" class="flex items-center">
        <button aria-label="Upvote">25</button>
        <button aria-label="Comments">26</button>
        <button aria-label="Repost">1</button>
        <shreddit-post-share-button style="margin-left: 8px;">
          <button aria-label="Share">Share</button>
        </shreddit-post-share-button>
      </div>
    </shreddit-post>

    <div id="comment-tree">
      <shreddit-comment thingid="t1_amr3k" author="amr3k" score="14" depth="0">
        <!-- Meme comment with only an image -->
        <div slot="comment">
          <img src="https://preview.redd.it/meme-sample.jpeg" alt="meme" />
        </div>
        <shreddit-async-loader bundlename="faceplate_hovercard"></shreddit-async-loader>
      </shreddit-comment>

      <shreddit-comment thingid="t1_small_summer" author="Small_Summer5817" score="7" depth="0">
        <div slot="comment">
          <p>If the source code is local, it will audit it.</p>
        </div>
        <shreddit-async-loader bundlename="faceplate_hovercard"></shreddit-async-loader>

        <shreddit-comment thingid="t1_op_reply" author="Accurate-Skill3425" score="14" depth="1" is-author="true">
          <div slot="comment">
            <p>I am inside the codebase local folder.</p>
          </div>
          <shreddit-async-loader bundlename="faceplate_hovercard"></shreddit-async-loader>
        </shreddit-comment>
      </shreddit-comment>
    </div>
  `;

  return container;
}
