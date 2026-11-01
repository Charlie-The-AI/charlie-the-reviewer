# Configuration Reference

`@thesonofman/charlie-the-reviewer` looks for configuration files in the root directory in the following order:

- `.ai-reviewer.yml`
- `.ai-reviewer.yaml`
- `ai-reviewer.yml`
- `ai-reviewer.yaml`
- `.github/ai-reviewer.yml`
- `.github/ai-reviewer.yaml`

You can also pass a custom configuration path using `--config <path>`.

---

## Full Configuration Schema

```yaml
ai:
  # AI Provider: 'openai' or 'gemini'
  provider: openai

  # AI Model name
  model: gpt-4o

  # Sampling temperature (0.0 - 2.0)
  temperature: 0.1

  # Maximum response tokens
  max_output_tokens: 4000

  # Automatic fallback provider on retryable rate limits or downtime
  fallback:
    enabled: true
    provider: gemini
    model: gemini-2.5-flash

  # Optional strictness-to-model mapping
  models:
    relaxed: gpt-4o-mini
    standard: gpt-4o
    strict: gpt-4o
    maximum: o3-mini

review:
  # Global strictness level: relaxed, standard, strict, maximum
  strictness: standard

  # Severities that fail the review / block merge
  fail_on:
    - critical
    - high

  # Minimum AI confidence required to publish findings (0.0 - 1.0)
  # NOTE: Critical and high security findings are NEVER suppressed by confidence.
  minimum_confidence: 0.75

  # Maximum inline comments to generate
  max_comments: 25

  # Noise reduction and deduplication
  noise_reduction:
    enabled: true
    deduplicate: true

  # Path-based strictness overrides (glob patterns)
  overrides:
    - paths:
        - "src/auth/**"
        - "src/payments/**"
        - "src/wallet/**"
      strictness: maximum
    - paths:
        - "src/components/**"
      strictness: standard
    - paths:
        - "docs/**"
        - "**/*.md"
      strictness: relaxed

  # Custom repository review rules
  custom_rules:
    - id: avoid-console-log
      description: "Avoid console.log in production code"
      severity: low

    - id: api-error-handling
      description: "All external API calls must handle failures"
      severity: medium

    - id: transaction-integrity
      description: "Financial operations must preserve transactional consistency"
      severity: critical
      paths:
        - "src/payments/**"
        - "src/wallet/**"

  # Merge enforcement configuration
  enforcement:
    enabled: true
    mode: status_check # 'status_check' or 'exit_code'

limits:
  max_files: 50
  max_diff_lines: 3000
  max_input_tokens: 60000
  max_output_tokens: 4000
  max_concurrent_requests: 3
  timeout_seconds: 120

ignore:
  - "**/*.min.js"
  - "**/*.min.css"
  - "**/*.map"
  - "**/package-lock.json"
  - "**/pnpm-lock.yaml"
  - "**/yarn.lock"
  - "**/composer.lock"
  - "**/dist/**"
  - "**/build/**"
```

---

## Environment Variable Overrides

Configuration settings can be overridden on the command line or in CI via environment variables:

| Environment Variable   | Overrides           | Description                                                   |
| :--------------------- | :------------------ | :------------------------------------------------------------ |
| `AI_REVIEW_PROVIDER`   | `ai.provider`       | Provider name (`openai`, `gemini`)                            |
| `AI_REVIEW_MODEL`      | `ai.model`          | Model name (e.g. `gpt-4o`, `gemini-2.5-flash`)                |
| `AI_REVIEW_STRICTNESS` | `review.strictness` | Strictness level (`relaxed`, `standard`, `strict`, `maximum`) |
| `OPENAI_API_KEY`       | -                   | OpenAI authentication token                                   |
| `GEMINI_API_KEY`       | -                   | Google Gemini authentication token                            |
| `GITHUB_TOKEN`         | -                   | GitHub authentication token for PRs and checks                |
