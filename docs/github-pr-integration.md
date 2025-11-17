# GitHub PR Integration Guide

DocHealth can compare documentation health between a pull request's base and head commits and publish the delta as a sticky GitHub comment. This document explains the authentication model, CLI flags, GitHub Actions workflow, and the verification steps used in Mission M5.4.

## 1. GitHub App authentication

1. Navigate to **Settings → Developer settings → GitHub Apps → New GitHub App**.
2. Configure the app with the following permissions:
   - **Repository permissions**: `Pull requests: Read & write`, `Contents: Read`.
   - **Events**: Subscribe to `Pull request`.
3. Generate a private key (PEM) and capture the **App ID** and **Installation ID** for the target repository/organization.
4. Install the app on the repositories that should receive DocHealth comments.

Expose the credentials as secrets in your repository or organization settings:

```bash
DOCHEALTH_GITHUB_APP_ID           # Numeric app identifier
DOCHEALTH_GITHUB_INSTALLATION_ID  # Installation ID for the repo/org
DOCHEALTH_GITHUB_PRIVATE_KEY      # PEM contents (multiline secret)
```

> You can also use `DOCHEALTH_GITHUB_PRIVATE_KEY_PATH` if you prefer to store the PEM on disk during local testing.

## 2. CLI usage

Generate DocHealth JSON reports for the base and head revisions:

```bash
node bin/dochealth.js check --json > reports/base.json   # base branch
node bin/dochealth.js check --json > reports/head.json   # feature branch
```

Post (or preview) the pull request comment:

```bash
node bin/dochealth.js pr-comment \
  --repo owner/repo \
  --pr 123 \
  --before-report ./reports/base.json \
  --after-report ./reports/head.json \
  --dry-run                               # optional preview
```

Additional flags introduced in M5.4:

| Flag | Purpose |
|------|---------|
| `--base-sha`, `--head-sha` | Provide commit SHAs for offline dry runs. When both values are supplied the CLI no longer hits the GitHub API. |
| `--base-ref`, `--head-ref` | Optional labels that appear in the rendered comment (e.g., `main`, `feature/api-docs`). |
| `--pr-url` | Customize the PR link that is displayed in dry-run output (useful for mock reviews). |
| `--identifier` | Override the hidden HTML marker used by the sticky comment pattern. |

## 3. Dry-run verification

Dry-run mode now supports complete offline testing. Supply both commit SHAs to skip GitHub API calls:

```bash
node bin/dochealth.js pr-comment \
  --repo acme/dochealth \
  --pr 47 \
  --before-report ./reports/base.json \
  --after-report ./reports/head.json \
  --dry-run \
  --base-sha 5c0a1e4 \
  --head-sha 9f8e7d4 \
  --base-ref main \
  --head-ref feature/git-action \
  --pr-url https://github.com/acme/dochealth/pull/47
```

The CLI prints the rendered Markdown locally so you can verify formatting and share it in design reviews before wiring up automation.

## 4. GitHub Actions workflow example

The repository ships with `.github/workflows/dochealth.yml`, which performs the following steps:

1. Trigger on `pull_request` events (`opened`, `synchronize`, `reopened`).
2. Check out the head commit and fetch the base branch into a temporary worktree.
3. Run `npm ci` for both directories.
4. Execute `dochealth check --json` on the base and head to create temporary reports in `$RUNNER_TEMP`.
5. Invoke `dochealth pr-comment` with the generated reports.
6. Provide `DOCHEALTH_GITHUB_*` secrets so the workflow can authenticate via GitHub App credentials.

You can copy the workflow into downstream repositories and adjust cache, matrix, or config paths as needed. Ensure the job is granted `pull-requests: write` permission so the action can post sticky comments.

## 5. Verification matrix

Mission M5.4 executed the following checks:

- `node --test tests/integration/github-pr-integration.test.js` – exercises delta calculation, sticky comment updates, offline dry-run mode, authentication failures, and rate-limit propagation.
- Manual dry-run of `dochealth pr-comment` using the new offline flags to confirm Markdown structure and identifier rendering.
- Static review of `.github/workflows/dochealth.yml` to ensure the triggers, permissions, and secrets match the documented expectations.

## 6. Troubleshooting

| Symptom | Resolution |
|---------|------------|
| `GitHub authentication failed` | Secrets are missing or invalid. Re-issue the private key and double-check App/Installation IDs. |
| `GitHub API rate limit exceeded` | The GitHub App hit per-hour limits. Wait a few minutes, reduce workflow concurrency, or contact GitHub support for higher allowances. |
| `Health report not found` | The CLI raises a descriptive error when `--before-report` or `--after-report` paths are wrong. Ensure both JSON files exist relative to the runner workspace. |
| Sticky comment not updating | Verify the workflow uses the default identifier (`<!-- dochealth-pr-health -->`). Override it via `--identifier` if a repository already uses that marker. |
| Markdown renders incorrectly | Use `--dry-run` locally and paste the comment into a PR description to double-check formatting before enabling automation. |

## 7. Example comment snippet

````markdown
DocHealth Health Delta – PR #47 (`feature/git-action` → `main`)

| Metric | Base | Head | Δ |
| ------ | ---- | ---- | -- |
| Health Score | 78 | 86 | +8 |

**New Issues**: _(none)_

**Resolved Issues**:
- ✅ `api.orders` freshness restored (0 days stale / 95% coverage)

<details>
  <summary>Remaining Issues (2)</summary>
  • `workflow.fulfillment` – coverage 72% (medium)
  • `semantic.protocol` – timestamps missing (low)
</details>

<!-- dochealth-pr-health -->
````

Refer back to this guide whenever you need to re-run verification, onboard a new repository, or troubleshoot environment-specific failures.
