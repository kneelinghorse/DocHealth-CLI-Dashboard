# Release Checklist (v1.0.0)

Use this checklist to verify release readiness before tagging a build. Items are grouped by
versioning, documentation, and quality gates. Reference this document during future releases
and capture command output summaries inline.

## Versioning & Metadata
- [x] Root `package.json` version bumped to **1.0.0**.
- [x] `dashboard/package.json` version bumped to **1.0.0**.
- [x] Package metadata (author, description, repository, homepage, bugs) reviewed for accuracy.

## Documentation & Governance
- [x] `CHANGELOG.md` created/updated with latest release notes.
- [x] `LICENSE` file verified as MIT.
- [x] README reviewed for accuracy and up-to-date commands.
- [x] Release checklist updated with verification results for this session (2025-11-17).

## Quality Gates
- [x] `npm run lint` *(warnings only; zero errors)*
- [x] `npm test`
- [x] `npm run test:coverage` (86.7% lines / 87.34% functions per `coverage/coverage-summary.json`)
- [x] `npm audit --omit=dev` *(resolved js-yaml to 4.1.1; 0 vulnerabilities)*
- [x] `node bin/dochealth.js check --path ./src` *(exits 1 as expected because sample manifests are intentionally stale)*
- [x] Manual dash sanity check via `npm --prefix dashboard run build` *(Vite build succeeded; chunk-size warnings only)*

> Update the checkbox statuses and include short notes (e.g., coverage %, CLI exit code) as you
> complete each step.
