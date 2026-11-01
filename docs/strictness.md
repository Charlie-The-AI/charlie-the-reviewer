# Review Strictness Levels & Overrides

`@thesonofman/ai-code-reviewer` features four configurable review strictness levels backed by a deterministic policy engine.

---

## 1. Strictness Levels

| Level       | Identifier | Focus Areas                                                                                                                                                                                                      | Avoids                                            |
| :---------- | :--------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------ |
| **Level 1** | `relaxed`  | Critical bugs, exploitable security vulnerabilities, fatal runtime crashes, data corruption.                                                                                                                     | Stylistic, speculative, and refactoring comments. |
| **Level 2** | `standard` | _Default_. All Relaxed checks plus: functional correctness, error handling, type safety, significant performance bottlenecks, API misuse, missing input validation.                                              | Nitpicky formatting and minor refactors.          |
| **Level 3** | `strict`   | All Standard checks plus: architectural boundaries, maintainability, code duplication, missing test coverage for critical paths, race conditions, concurrency issues, high complexity.                           | Overly speculative architectural overhauls.       |
| **Level 4** | `maximum`  | All Strict checks plus: exhaustive defense-in-depth security, detailed architectural resilience, transactional consistency (ACID), subtle edge cases, documentation completeness, conventions, test brittleness. | Nothing omitted. Exhaustive scrutiny.             |

---

## 2. Path-Based Strictness Overrides

Different components of your codebase warrant different levels of scrutiny. You can map glob patterns to strictness levels:

```yaml
review:
  strictness: standard

  overrides:
    - paths:
        - "src/auth/**"
        - "src/payments/**"
        - "src/wallet/**"
      strictness: maximum

    - paths:
        - "src/components/**"
        - "src/screens/**"
      strictness: standard

    - paths:
        - "docs/**"
        - "**/*.md"
      strictness: relaxed
```

### Precedence Resolution

1. If a file matches multiple override patterns, **later overrides in the list take precedence**.
2. If no overrides match, the global `review.strictness` is applied.
3. Multiple strictness levels coexist within the same pull request.

---

## 3. Merge Enforcement

Configure which findings block merging or fail the CI status check:

```yaml
review:
  fail_on:
    - critical
    - high

  enforcement:
    enabled: true
    mode: status_check # Creates GitHub Check Run failure or non-zero exit code
```
