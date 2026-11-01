# GitHub Actions Workflow Example

This directory contains a battle-tested, secure GitHub Actions workflow for `@thesonofman/charlie-the-reviewer`.

## Security Highlights

1. **Least Privilege:** Only requests `contents: read`, `pull-requests: write`, and `checks: write`.
2. **Pinned Action SHAs:** Uses immutable commit hashes for official Actions (`actions/checkout`, `actions/setup-node`) to defend against supply chain tampering.
3. **Concurrency Control:** Cancels stale review jobs when new commits are pushed to the same pull request.
4. **Fork Protection:** Disables executing workflow with repo secrets on external untrusted pull request forks.
