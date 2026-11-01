# npm Publishing & Release Management Guide

This document describes how `@Timbaron/charlie-the-reviewer` is packaged, versioned, and published to the npm registry using Changesets and GitHub Actions Trusted Publishing (OIDC).

---

## 1. Prerequisites

1. **npm Account:** Register an account on [npmjs.com](https://www.npmjs.com/).
2. **Organization / Scope:**
   - The package is scoped to `@sonofman01`. Ensure you belong to the `@sonofman01` organization on npm, or create the organization under your account settings.
   - For public scoped packages, npm publishes with `--access public`.

---

## 2. Package Validation Before Publishing

Before releasing, always run the validation suite locally:

```bash
# 1. Typecheck and lint
npm run typecheck
npm run lint

# 2. Build ESM bundle and TypeScript declarations
npm run build

# 3. Execute test suite
npm test

# 4. Dry-run package tarball generation
npm pack --dry-run
```

Verify that `npm pack --dry-run` contains only the required files:

- `dist/index.js`
- `dist/index.d.ts`
- `dist/cli/index.js`
- `dist/cli/index.d.ts`
- `package.json`
- `README.md`
- `LICENSE`
- `CHANGELOG.md`

---

## 3. Versioning with Changesets

We use [Changesets](https://github.com/changesets/changesets) for semantic versioning and automated changelog generation.

### Adding a Changeset

When preparing changes, run:

```bash
npx changeset
```

Follow the interactive prompts:

1. Select which packages to bump (patch, minor, major).
2. Write a summary of the changes.
3. Commit the generated markdown file in `.changeset/`.

### Bumping Version

When ready to cut a new release:

```bash
npm run version-packages
git add .
git commit -m "chore(release): bump version"
```

---

## 4. Publishing the First Release

For the initial release, authenticate with npm and publish:

```bash
npm login
npm publish --access public
```

---

## 5. Automated CI/CD Publishing (Trusted Publishing / OIDC)

Once the first version is published on npm, configure **Trusted Publishing**:

1. On npmjs.com, go to `@Timbaron/charlie-the-reviewer` > **Settings** > **Publishing Access**.
2. Select **Add GitHub Actions**.
3. Specify:
   - Organization/User: `sonofman01`
   - Repository: `charlie-the-reviewer`
   - Workflow file: `.github/workflows/release.yml`
4. The workflow in `.github/workflows/release.yml` will automatically publish updates to npm with cryptographic provenance whenever changes are merged to `main`.

---

## 6. Verifying Installation in Another Repository

To test the published package in an external repository:

```bash
mkdir /tmp/test-repo && cd /tmp/test-repo
git init -b main
echo "test" > test.txt
git add test.txt && git commit -m "initial commit"

# Test CLI execution
npx --yes @Timbaron/charlie-the-reviewer review --staged
```
