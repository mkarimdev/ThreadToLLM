# Native In-Page Action Injection Over Floating Overlay

We inject the trigger action button directly into the host platform's native interface layout (e.g. post action bars or header utility rows) styled to match each platform's design system, rather than rendering a generic floating overlay button. A floating button obstructs page content, feels intrusive, and looks detached; embedding a native-styled button provides a seamless, non-intrusive user experience at the trade-off of maintaining platform-specific mount points.
