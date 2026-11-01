# Next.js Integration Example

This example demonstrates how to configure `@thesonofman/charlie-the-reviewer` in a Next.js (App Router or Pages Router) codebase.

## Key Features

- **Maximum Strictness for Route Handlers:** Scrutinizes `app/api/**` and `pages/api/**` for unauthenticated endpoints, parameter injection, and edge runtime constraints.
- **Custom Rule for Component Serialization:** Flags non-serializable objects (such as class instances or functions) passed across Server/Client component boundaries.
- **Ignored Artifacts:** Automatically excludes `.next/**`, `out/**`, and lockfiles.

## Usage

```bash
# Set your API credentials
export OPENAI_API_KEY="your-key-here"

# Review your current branch changes against main
npx charlie-the-reviewer review --base main
```
