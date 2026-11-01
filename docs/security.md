# Security Architecture & Safeguards

Automated AI code reviewers process untrusted source code and diffs. Security must be treated as a first-class requirement.

---

## 1. Threat Model & Safeguards

| Threat                       | Safeguard Implemented                                                                                                                                                                                                                                          |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prompt Injection Attacks** | Diffs and comments are treated as untrusted data. The system prompt contains explicit anti-injection instructions forbidding compliance with commands inside reviewed code. Attempted injections are detected and reported as high/critical security findings. |
| **Code Execution Risks**     | Reviewed code is **never** executed, imported, or evaluated during analysis. All analysis operates purely on AST/token textual data.                                                                                                                           |
| **Credential Leakage**       | All debug logs and context collection pass through an automated `redactSecrets` sanitizer before logging or network transmission.                                                                                                                              |
| **Command Injection in CLI** | Native Git operations strictly use `execFile` with argument arrays. No shell strings are ever concatenated with untrusted file names or refs.                                                                                                                  |
| **Path Traversal Attacks**   | Paths are normalized and strictly validated against the set of changed files reported by the Git repository or GitHub API. Hallucinated or traversing paths (`../`) are filtered out.                                                                          |
| **Oversized Input / DoS**    | Enforced bounds on file count (`max_files`), line count (`max_diff_lines`), context tokens (`max_input_tokens`), and timeouts. Diff chunking safely handles large changes.                                                                                     |
| **Forked PR Attacks in CI**  | Workflows specify `if: github.event.pull_request.head.repo.full_name == github.repository` to prevent untrusted PR forks from acquiring repository secrets.                                                                                                    |
| **Supply Chain Tampering**   | GitHub Actions dependencies in official workflows are pinned to audited, immutable full-length commit SHAs.                                                                                                                                                    |

---

## 2. Privacy & Data Transmission Notice

When running `@Timbaron/charlie-the-reviewer`:

- Changed file diffs and surrounding context lines are transmitted over HTTPS to your configured AI provider (`api.openai.com` or `generativelanguage.googleapis.com`).
- Check your provider's terms of service regarding data retention and model training. Both OpenAI API and Google Gemini API (paid tiers) do not use API data to train models.
- Secrets, tokens, and repository credentials in diffs are sanitized prior to transmission.
