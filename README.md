# Universal AI Code Reviewer (`@thesonofman/charlie-the-reviewer`)

[![CI](https://github.com/thesonofman/charlie-the-reviewer/actions/workflows/ci.yml/badge.svg)](https://github.com/thesonofman/charlie-the-reviewer/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@thesonofman/charlie-the-reviewer.svg)](https://www.npmjs.com/package/@thesonofman/charlie-the-reviewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](package.json)

**Universal, automated, AI-powered code reviews for GitHub Pull Requests and local Git changes.**

Built with TypeScript and Node.js 22+, `@thesonofman/charlie-the-reviewer` offers a provider-agnostic engine with native support for **OpenAI** and **Google Gemini**, 4-tier strictness policies, custom review rules, path overrides, prompt injection defense, and GitHub Actions PR commenting.

---

## 🌟 Key Features

- **Multi-Provider Architecture:** Switch between OpenAI and Google Gemini via simple YAML configuration or environment variables — zero code changes required.
- **Automated Fallback:** Seamlessly fail over to a secondary provider if the primary encounters rate limits or outages.
- **4 Strictness Levels:** From Relaxed (critical bugs & CVEs only) to Maximum (exhaustive defense-in-depth, ACID consistency, and edge cases).
- **Path-Based Overrides:** Scrutinize payment, auth, and crypto modules under Maximum strictness while keeping UI and documentation relaxed.
- **Custom Repository Rules:** Define organizational guidelines with custom severities and path scopes.
- **Rich GitHub PR Integration:** Publishes consolidated PR summaries, inline diff comments, and merge-blocking status checks.
- **Context-Aware Analysis:** Bounded surrounding context (types, imports, tests) without overflowing token limits.
- **Cost & Token Controls:** Built-in token budgeting, patch chunking, and live USD cost estimates.
- **DevSecOps by Design:** Built-in secret redaction, safe argument array execution (zero shell interpolation), and defense against embedded prompt injection attacks.
- **Dual API:** CLI binary (`charlie-the-reviewer`) and fully typed programmatic TypeScript library (`createReviewer`).

---

## 🚀 Quick Start

### 1. Installation

```bash
# Install as a dev dependency
npm install -D @thesonofman/charlie-the-reviewer

# Or install globally
npm install -g @thesonofman/charlie-the-reviewer
```

### 2. Configure Your AI Provider

Obtain an API key from either provider:

- **OpenAI:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Google Gemini:** [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

Export the key in your terminal or CI environment:

```bash
# If using OpenAI
export OPENAI_API_KEY="sk-..."

# If using Google Gemini
export GEMINI_API_KEY="AIzaSy..."
```

### 3. Initialize Configuration

```bash
npx charlie-the-reviewer init
```

This creates an `.ai-reviewer.yml` file in your repository root.

### 4. Run a Code Review

```bash
# Review local uncommitted working tree changes
npx charlie-the-reviewer review

# Review staged changes
npx charlie-the-reviewer review --staged

# Review branch differences against main
npx charlie-the-reviewer review --base main

# Review specific commit
npx charlie-the-reviewer review --commit HEAD~1
```

---

## 🔄 Provider Setup & Switching

Switching providers requires no code changes. Simply update your `.ai-reviewer.yml` or set an environment variable.

### OpenAI Setup

```yaml
# .ai-reviewer.yml
ai:
  provider: openai
  model: gpt-4o # or gpt-4o-mini, o3-mini
  temperature: 0.1
  max_output_tokens: 4000
```

```bash
export OPENAI_API_KEY="sk-..."
npx charlie-the-reviewer review
```

### Google Gemini Setup

```yaml
# .ai-reviewer.yml
ai:
  provider: gemini
  model: gemini-2.5-flash # or gemini-2.5-pro
  temperature: 0.1
  max_output_tokens: 4000
```

```bash
export GEMINI_API_KEY="AIzaSy..."
npx charlie-the-reviewer review
```

### Switch On-the-Fly via CLI or Environment Variable

```bash
# CLI flag
npx charlie-the-reviewer review --provider gemini --model gemini-2.5-flash

# Environment variables (ideal for CI matrix jobs)
AI_REVIEW_PROVIDER=gemini AI_REVIEW_MODEL=gemini-2.5-flash npx charlie-the-reviewer review
```

### Provider Fallback

Ensure zero downtime during CI runs by enabling automatic fallback:

```yaml
ai:
  provider: openai
  model: gpt-4o

  fallback:
    enabled: true
    provider: gemini
    model: gemini-2.5-flash
```

If OpenAI returns a transient rate limit (`429`) or server error (`5xx`), the review automatically switches to Gemini and records this in the review metadata.

---

## 🎯 Configurable Strictness Levels

| Strictness                 | Focus                                                                                                  | Recommended Use Cases                                        |
| :------------------------- | :----------------------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| **`relaxed`**              | Critical bugs, exploitable vulnerabilities, fatal crashes, data corruption.                            | Hotfixes, documentation, legacy refactors.                   |
| **`standard`** _(Default)_ | Relaxed + functional correctness, error handling, type safety, performance bugs, resource leaks.       | General product pull requests, day-to-day development.       |
| **`strict`**               | Standard + architecture, maintainability, code duplication, test gaps, concurrency race conditions.    | Core libraries, shared packages, public APIs.                |
| **`maximum`**              | Strict + exhaustive defense-in-depth, ACID consistency, edge cases, documentation, contract stability. | Authentication, payment gateways, financial ledgers, crypto. |

### Path-Based Overrides

Apply different strictness levels across your repository:

```yaml
review:
  strictness: standard

  overrides:
    - paths:
        - "src/auth/**"
        - "src/payments/**"
      strictness: maximum

    - paths:
        - "docs/**"
      strictness: relaxed
```

---

## 📋 Custom Review Rules

Enforce team conventions and domain-specific rules:

```yaml
review:
  custom_rules:
    - id: avoid-console-log
      description: "Avoid console.log in production code"
      severity: low

    - id: api-error-handling
      description: "All external API calls must handle failures gracefully"
      severity: medium

    - id: transaction-integrity
      description: "Financial operations must preserve transactional consistency"
      severity: critical
      paths:
        - "src/payments/**"
        - "src/wallet/**"
```

---

## 🤖 GitHub Actions Workflow

Create `.github/workflows/ai-review.yml`:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  checks: write

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  ai-review:
    name: Run AI Reviewer
    runs-on: ubuntu-latest
    if: github.event.pull_request.head.repo.full_name == github.repository

    steps:
      - name: Checkout Code
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a # v4.2.0
        with:
          node-version: 22.x

      - name: Run Review
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: ${{ github.token }}
        run: |
          npx --yes @thesonofman/charlie-the-reviewer review \
            --pr ${{ github.event.pull_request.number }} \
            --post-github
```

---

## 💻 Programmatic API

Use the library directly in custom tools, bots, or CI scripts:

```typescript
import { createReviewer } from "@thesonofman/charlie-the-reviewer";

const reviewer = createReviewer({
  provider: "openai",
  model: "gpt-4o",
  strictness: "strict",
});

// Review branch changes
const result = await reviewer.review({
  base: "main",
  head: "HEAD",
});

console.log(`Status: ${result.status}`);
console.log(`Duration: ${result.durationMs}ms`);
console.log(`Total Findings: ${result.findings.length}`);
console.log(`Blocking Issues: ${result.blockingFindings.length}`);

for (const finding of result.findings) {
  console.log(
    `[${finding.severity.toUpperCase()}] ${finding.file}:${finding.line} - ${finding.title}`
  );
}
```

---

## ⚙️ CLI Reference

```text
Usage: charlie-the-reviewer [options] [command]

Universal automated AI code reviewer for GitHub pull requests and local Git changes

Options:
  -V, --version                 Output the version number
  -c, --config <path>           Path to custom configuration YAML file
  -q, --quiet                   Suppress non-essential console logs
  -d, --debug                   Enable verbose debug logs with secret redaction
  -h, --help                    Display help for command

Commands:
  review [options]              Review code changes
    -p, --provider <name>       Override AI provider (openai, gemini)
    -m, --model <name>          Override AI model (gpt-4o, gemini-2.5-flash)
    -s, --strictness <level>    Override strictness (relaxed, standard, strict, maximum)
    --base <branch>             Review changes against base branch
    --head <branch>             Head ref for comparison (default: HEAD)
    --staged                    Review only staged Git changes
    --commit <sha>              Review specific commit
    --pr <number>               Review a GitHub Pull Request
    --format <type>             Output format: console, json, markdown (default: console)
    --post-github               Publish review comments and summary to GitHub PR

  init [options]                Initialize .ai-reviewer.yml configuration
    -f, --force                 Overwrite existing configuration file

  config validate               Validate configuration file against schema
  providers list                List registered AI providers and credentials
```

---

## 🔒 Security Best Practices

1. **Prompt Injection Defense:** Diffs, comments, and commit messages are untrusted data. Attempted prompt injections are detected and reported as security violations.
2. **Zero Code Execution:** Untrusted code being reviewed is never executed or evaluated.
3. **Secret Redaction:** API keys, GitHub tokens, and private keys are redacted from logs and context.
4. **Subprocess Safety:** Native Git CLI commands use safe argument arrays to prevent shell command injection.
5. **Least Privilege:** GitHub Actions requires only `contents: read`, `pull-requests: write`, and `checks: write`.

---

## 🛠 Troubleshooting

| Problem                             | Cause                                 | Resolution                                                              |
| :---------------------------------- | :------------------------------------ | :---------------------------------------------------------------------- |
| `Missing OPENAI_API_KEY`            | Environment variable not exported     | Run `export OPENAI_API_KEY="..."` or define it in your CI secrets.      |
| `Missing GEMINI_API_KEY`            | Environment variable not exported     | Run `export GEMINI_API_KEY="..."` or define it in your CI secrets.      |
| `Configuration validation failed`   | YAML syntax or schema error           | Run `npx charlie-the-reviewer config validate` to inspect field issues. |
| `Could not create GitHub Check Run` | Insufficient GitHub token permissions | Ensure your GitHub workflow has `permissions: checks: write`.           |

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for local development setup, testing guidelines, and submission steps.

---

## 📄 License

Distributed under the [MIT License](LICENSE). Copyright © 2026 Akiode Timothy.
