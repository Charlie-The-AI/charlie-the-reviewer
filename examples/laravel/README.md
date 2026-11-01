# Laravel PHP Integration Example

This example demonstrates how to configure `@thesonofman/ai-code-reviewer` for Laravel PHP applications.

## Key Features

- **Mass Assignment Vulnerabilities:** Detects unvalidated `$request->all()` passes to Eloquent models.
- **Route Authorization & Middleware:** Ensures new web and API routes apply proper authorization policies.
- **Exclusion of Vendor Artifacts:** Automatically ignores `vendor/**` and `composer.lock`.

## Usage

```bash
# Review the latest commit
npx ai-code-reviewer review --commit HEAD
```
