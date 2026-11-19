/**
 * Representative Modern Reddit DOM fixture for a partially expanded thread.
 * Mirrors the host behaviour where scrolling hydrates some replies until an
 * unclicked "View more comments" trigger remains inside #comment-tree.
 */

export function createPartialRedditThreadFixture(): HTMLDivElement {
  const container = document.createElement('div');
  container.innerHTML = `
    <shreddit-post
      id="t3_partial"
      post-title="Thread with more comments to load"
      author="op_user"
      score="60"
      comment-count="26"
      permalink="/r/test/comments/partial"
    >
      <div slot="text-body">
        <div class="rtjson-content"><p>How do you handle partial threads?</p></div>
      </div>
    </shreddit-post>

    <div id="comment-tree">
      <shreddit-comment thingid="t1_loaded" author="loaded_user" score="12" depth="0">
        <div slot="comment">
          <div class="rtjson-content"><p>One loaded comment.</p></div>
        </div>
      </shreddit-comment>
      <shreddit-comment-tree-action>
        <button>View more comments</button>
      </shreddit-comment-tree-action>
    </div>
  `;

  return container;
}
