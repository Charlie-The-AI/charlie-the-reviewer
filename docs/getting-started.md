# Getting Started with `@Timbaron/charlie-the-reviewer`

`@Timbaron/charlie-the-reviewer` provides automated, AI-powered code reviews for GitHub pull requests and local Git changes, with native support for OpenAI and Google Gemini.

---

## 1. Installation

Install the package globally or as a project development dependency:

### Project Dependency (Recommended)

```bash
npm install -D @Timbaron/charlie-the-reviewer
# or
pnpm add -D @Timbaron/charlie-the-reviewer
# or
yarn add -D @Timbaron/charlie-the-reviewer
```

### Global Installation

```bash
npm install -g @Timbaron/charlie-the-reviewer
```

---

## 2. Setting Up AI Provider Credentials

Obtain an API key from either provider:

- **OpenAI:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Google Gemini:** [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

Export your credentials into your environment:

```bash
# For OpenAI
export OPENAI_API_KEY="sk-..."

# For Google Gemini
export GEMINI_API_KEY="AIzaSy..."
```

---

## 3. Initialize Configuration

Generate an `.ai-reviewer.yml` configuration file:

```bash
npx charlie-the-reviewer init
```

Verify your configuration with:

```bash
npx charlie-the-reviewer config validate
```

---

## 4. Run Your First Review

### Review Local Working Tree Changes

```bash
npx charlie-the-reviewer review
```

### Review Staged Changes Only

```bash
npx charlie-the-reviewer review --staged
```

### Review Differences Against Main Branch

```bash
npx charlie-the-reviewer review --base main
```

### Review a GitHub Pull Request

```bash
export GITHUB_TOKEN="ghp_..."
npx charlie-the-reviewer review --pr 42 --post-github
```

---

## 5. Programmatic API

You can also run reviews programmatically inside node scripts or custom CI tools:

```typescript
import { createReviewer } from "@Timbaron/charlie-the-reviewer";

const reviewer = createReviewer({
  provider: "openai",
  model: "gpt-4o",
  strictness: "strict",
});

const result = await reviewer.review({
  base: "main",
  head: "HEAD",
});

console.log(`Review Status: ${result.status}`);
console.log(`Findings: ${result.findings.length}`);
```
