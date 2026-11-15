# Token-Dense Markdown Output Schema

The default Markdown Serializer structures threads using structured YAML frontmatter and a clean, indented comment hierarchy with inline badges (e.g. `**[+45] author (OP)**: text`) rather than deep blockquotes (`>`) and multi-line attribution blocks. Standard visual blockquotes consume up to 40% of an LLM's context window on structural tokens; an indented, compact representation maximizes signal-to-token ratio while keeping comment nesting unambiguous for LLM reasoning.
