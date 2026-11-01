# Contributing to `@thesonofman/charlie-the-reviewer`

Thank you for your interest in contributing to `@thesonofman/charlie-the-reviewer`!

---

## 1. Development Environment

### Prerequisites

- Node.js 22.0.0 or higher
- npm 10+
- Git

### Initial Setup

```bash
git clone https://github.com/thesonofman/charlie-the-reviewer.git
cd charlie-the-reviewer
npm install
```

---

## 2. Development Workflow

- **Build Package:**
  ```bash
  npm run build
  ```
- **Typecheck:**
  ```bash
  npm run typecheck
  ```
- **Run Tests:**
  ```bash
  npm test
  ```
- **Lint & Format:**
  ```bash
  npm run lint
  npm run format:check
  ```

---

## 3. Pull Request Guidelines

1. **Tests:** All changes must include corresponding unit, integration, or e2e tests.
2. **Formatting & Linting:** Code must pass `npm run lint` and `npm run format:check`.
3. **Changesets:** For any user-facing or breaking changes, run `npx changeset` to create a changelog entry.
4. **Security:** Never commit API keys or test credentials to the repository.
