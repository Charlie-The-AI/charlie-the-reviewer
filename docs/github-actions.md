# GitHub Actions Integration Guide

Integrating `@thesonofman/ai-code-reviewer` into GitHub Actions provides automated inline feedback and status checks directly on pull requests.

---

## 1. Setup GitHub Secrets

In your GitHub repository, navigate to **Settings > Secrets and variables > Actions** and create:

- `OPENAI_API_KEY`: Your OpenAI API key (if using OpenAI).
- `GEMINI_API_KEY`: Your Google Gemini API key (if using Gemini).

> [!NOTE]
> `GITHUB_TOKEN` is automatically provided by GitHub Actions and requires no manual setup.

---

## 2. Recommended Workflow File

Create `.github/workflows/ai-review.yml` in your repository:

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

      - name: Run AI Review
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: ${{ github.token }}
        run: |
          npx --yes @thesonofman/ai-code-reviewer review \
            --pr ${{ github.event.pull_request.number }} \
            --post-github
```

---

## 3. Pull Request Feedback Mechanics

When a pull request triggers the workflow:

1. **Summary Comment:** The reviewer publishes a comprehensive summary table with overall status, metrics, and blocking findings. When subsequent commits are pushed, the reviewer automatically **updates the existing comment** rather than spamming multiple comments.
2. **Inline Comments:** Concrete findings with suggestions are published directly to the affected line in the diff.
3. **Duplicate Prevention:** If an issue has already been reported on a line, duplicate comments are suppressed.
4. **Out-of-Diff Findings:** Findings referring to code outside the diff hunks are listed cleanly in a dedicated section in the PR summary.
5. **Branch Protection:** You can configure the `AI Code Review` Check Run as a **Required Status Check** in your repository's Branch Protection settings.
