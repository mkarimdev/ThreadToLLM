# Canonical Thread Document Intermediate Representation

We isolate platform scraping from output generation using a three-stage pipeline: Platform Adapter to `ThreadDocument` IR, to Filter Pipeline, to Markdown Serializer. Direct-to-markdown scraping tightly couples site-specific selectors with noise pruning and text formatting; introducing a normalized domain model ensures bot filtering, score thresholds, depth limiting, and token formatting are written once and shared across all future platforms (Hacker News, X, GitHub).
