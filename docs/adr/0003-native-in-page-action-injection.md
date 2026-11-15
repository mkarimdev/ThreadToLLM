# Native In-Page Action Injection Over Floating Overlay

We inject the trigger action button directly into the host platform's native interface layout (e.g. post action bars or header utility rows) styled to match each platform's design system, rather than rendering a generic floating overlay button. A floating button obstructs page content, feels intrusive, and looks detached; embedding a native-styled button provides a seamless, non-intrusive user experience at the trade-off of maintaining platform-specific mount points.

## Platform Mount Targets

For Modern Reddit (`shreddit`), action buttons are mounted within `<shreddit-post>` resolving across layout variants via the following selector cascade:
1. `shreddit-post-action-bar` (dedicated action bar custom element)
2. `[slot="action-bar"]` (light-DOM slotted action row)
3. `[slot="credit-bar"]` (metadata and action footer slot)
4. `shreddit-post-share-button` parent element (direct sibling container alongside native share actions)
5. `<shreddit-post>` itself as safe fallback if no dedicated container is exposed
