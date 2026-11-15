# ThreadToLLM

A browser extension that extracts social discussion threads from host platforms and normalizes them into token-efficient Markdown for LLM ingestion.

## Language

**Host Platform**:
A third-party social or discussion website (such as Reddit, Hacker News, or X) hosting the conversation.
_Avoid_: Target site, vendor, provider

**Original Post**:
The initial submission or top-level topic that anchors a discussion thread.
_Avoid_: Root post, main post, topic, submission, OP post

**Thread Document**:
The normalized, platform-agnostic intermediate representation of an entire discussion thread.
_Avoid_: Thread object, parsed post, scraped data, conversation payload

**Comment Tree**:
The hierarchical tree of user replies and sub-replies stemming from the Original Post.
_Avoid_: Reply chain, comment list, conversation thread

**Hydrated Comment**:
A comment element that has been fully fetched and rendered into the host platform's client DOM.
_Avoid_: Visible comment, loaded comment, rendered node

**Platform Adapter**:
A platform-specific extraction module responsible for inspecting the host platform's DOM and producing a Thread Document.
_Avoid_: Scraper, parser, extractor, crawler

**Filter Pipeline**:
The sequence of filtering rules that prunes noise (such as automated bot replies, deleted content, and excess depth) from a Thread Document.
_Avoid_: Cleaner, sanitizer, pruner, trimmer

**Markdown Serializer**:
The component that formats a filtered Thread Document into token-dense Markdown structured for LLM consumption.
_Avoid_: Formatter, exporter, printer

**Thread Action**:
The platform-styled in-page button mounted into the host platform's interface that initiates extraction.
_Avoid_: Copy button, floating button, extension trigger

**Micro-Feedback**:
The temporary visual state transition rendered directly within the Thread Action indicating successful clipboard copy.
_Avoid_: Toast alert, popup badge, snackbar

**Depth Limit**:
The maximum hierarchical tier of nested replies retained from the Original Post during filtering.
_Avoid_: Max depth, nesting level, reply ceiling

**Platform UI**:
The platform-specific module responsible for mounting the Thread Action and rendering Micro-Feedback in the host platform.
_Avoid_: View binder, button injector, UI hook, widget

**Leaf Comment**:
A comment node in the Comment Tree that has no replies.
_Avoid_: Terminal comment, end node, childless comment

**Deleted Placeholder**:
A redacted comment node preserved in the Comment Tree solely to retain conversational hierarchy for its active replies.
_Avoid_: Tombstone, ghost comment, empty node
