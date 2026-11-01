# Changelog

All notable changes to `@thesonofman/charlie-the-reviewer` will be documented in this file.

## 0.1.0

### Minor Changes

- Initial production-ready release of `@thesonofman/charlie-the-reviewer`.
- Modular AI provider architecture supporting OpenAI and Google Gemini.
- Configurable strictness levels: Relaxed, Standard, Strict, Maximum.
- Path-based strictness overrides with glob matching.
- Custom review rules with severity and path scoping.
- Git diff analysis for local working tree, staged changes, branches, and commits.
- GitHub integration with PR review summaries, inline comments, and merge enforcement.
- Cost and performance controls (token budgeting, chunking, deduplication).
- CLI commands (`review`, `init`, `config validate`, `providers list`).
