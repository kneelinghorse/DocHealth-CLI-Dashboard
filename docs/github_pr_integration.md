# GitHub PR Integration

DocHealth can publish actionable documentation health deltas directly to GitHub pull requests. The CLI compares health reports between the base and head commits, formats the diff as Markdown, and uses a GitHub App installation to post a sticky comment.

## Prerequisites

1. **GitHub App authentication**
   - Create a GitHub App with `pull_requests: write` permission.
   - Install the app on the repositories that should receive DocHealth comments.
   - Capture the App ID, Installation ID, and private key (PEM).
2. **Environment variables**

   ```bash
   export DOCHEALTH_GITHUB_APP_ID="123456"
   export DOCHEALTH_GITHUB_INSTALLATION_ID="9876543"
   export DOCHEALTH_GITHUB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
   # or set DOCHEALTH_GITHUB_PRIVATE_KEY_PATH=/path/to/private-key.pem
   ```

3. **Health reports** – run `dochealth check --json > report.json` for both the base commit and the head commit. These reports capture protocol level freshness and coverage metrics used to calculate deltas.

## CLI usage

```bash
node bin/dochealth.js pr-comment \
  --repo acme/dochealth \
  --pr 123 \
  --before-report ./reports/base.json \
  --after-report ./reports/head.json
```

Options:

- `--dry-run` – renders the comment locally without posting to GitHub.
- `--app-id`, `--installation-id`, `--private-key`, `--private-key-path` – override authentication values for ad-hoc runs.
- `--identifier` – customize the hidden HTML marker used for the sticky comment pattern (defaults to `<!-- dochealth-pr-health -->`).

## Health delta calculation

`calculateHealthDelta` compares the per-protocol findings in DocHealth JSON reports and produces:

- Score delta (before → after) with severity breakdowns.
- Newly introduced issues (stale docs, missing timestamps, low coverage).
- Resolved issues when the head commit fixes prior findings.
- Remaining open issues, limited to the five most urgent in the comment body.

The formatted Markdown comment follows the "summary + collapsible details" pattern recommended in mission R4.2. It includes:

- A metrics table for health score and severity counts.
- Sections for new and resolved issues.
- A `<details>` block with the per-severity table, top remaining issues, and the exact base/head SHAs.
- A hidden identifier so DocHealth can update the same comment on subsequent pushes.

## GitHub Actions workflow

`/.github/workflows/dochealth.yml` executes the hybrid approach from R4.2: Node.js CLI logic + lightweight workflow wrapper. The workflow:

1. Checks out the head commit and prepares a base branch worktree.
2. Runs `dochealth check --json` twice to create base/head reports.
3. Invokes `dochealth pr-comment` with the generated report paths.
4. Authenticates via GitHub App secrets exposed as `DOCHEALTH_GITHUB_*` variables.

The job requires `pull-requests: write` permission to create or update comments. Update the workflow if your repository needs different install paths or caching strategies.

## Troubleshooting

- **Missing credentials** – the CLI validates that App ID, Installation ID, and private key are present. Ensure secrets are populated in repository or organization settings.
- **Report not found** – the command throws a descriptive error when the before/after report paths are invalid.
- **Rate limiting** – the Octokit client ships with retry + throttling plugins and logs when it backs off. Persistent throttling usually means the app needs higher rate limit allocations.

This document, the workflow, and the new CLI command satisfy Mission M4.5 deliverables for GitHub PR delta comments.
