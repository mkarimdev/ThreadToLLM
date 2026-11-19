# Decision history

Decisions that reverse or disable a capability belong here, with the commits and the reason. This is the first place to look when a "new" feature request turns out to be something the repo already tried.

## Partial-load detection (#20)

- Built in `5658ba2` (#12) and hardened against hovercard false positives in `33e053f` (#8).
- Disabled in `42e2ad6`: count-based inference (`comment-count` includes removed, spam-filtered and shadowbanned comments) and loaders unscoped from `#comment-tree` (sidebars, author hovercards) produced frequent false positives.
- Codified as a ban in `07dfb8c` / `af3c2f6`, while ADR-0004 still required truncation metadata — a contradiction resolved by ADR-0011 when the feature was re-enabled in `9ed71bf` (#20).
- Current rule: flag only DOM-evidenced unclicked pagination inside `#comment-tree`; host counts are never a trigger (approach #3 frontmatter counts were explicitly declined by the owner).

## Recording a reversal

Add a section here naming the commits and the reason, add an ADR for the architectural decision, and update any standard that encoded the old behaviour in the same change.
