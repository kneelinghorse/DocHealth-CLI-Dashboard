---
title: Dashboard Workflow Integration Tests
description: How to run and interpret the CLI→dashboard integration tests that exercise the DocHealth check command, SQLite writer, and dashboard API.
---

# Dashboard Workflow Integration Tests

The `tests/integration/dashboard-workflow.test.js` suite exercises the full DocHealth workflow: CLI `check --write-db` → dashboard SQLite repository → Express API. Use this reference when you need to validate that the CLI, persistence layer, and dashboard server stay in sync.

## Prerequisites

- Node.js 18+ (the tests rely on the built-in `node:test` runner and native `fetch`).
- Project dependencies installed via `npm install` at the repo root (installs CLI + dashboard deps, including `better-sqlite3`).
- The `dashboard/` workspace present at `project-root/dashboard` (the writer inspects `server/db/healthRepository.js`).

## Running the Tests

```bash
# Run only the dashboard workflow suite
dochealth$ npm run test:integration -- tests/integration/dashboard-workflow.test.js

# Run the full integration test matrix (recommended before commits)
dochealth$ npm run test:integration
```

The CLI emits a warning about one protocol failing to load; this is expected fixture behavior and does not fail the suite.

## Test Coverage

`tests/integration/dashboard-workflow.test.js` bundles targeted helpers:

- `setupTestDatabase()`/`teardownTestDatabase()` – create a temp SQLite path per test to avoid state bleed.
- `executeCLICheck()` – runs `node bin/dochealth.js check --json --write-db <path>` with deterministic flags.
- `startDashboardServer()` – spins up the Express API bound to a random localhost port for assertions.
- Fixture loader – `tests/fixtures/dashboard-analysis-fixture.json` feeds `writeToDashboard` to verify schema fidelity.

The suite implements the success criteria from Mission M5.3:

1. CLI check writes analysis runs and snapshots to SQLite, verified by querying the repository.
2. `/api/health/current` mirrors the latest run.
3. `/api/health/history?days=<n>` returns multiple runs sorted by recency.
4. Data transformation integrity checks prove that protocol snapshots retain their combined/freshness/coverage metrics.
5. Missing dashboard workspaces trigger the expected warning without aborting CLI execution.
6. Database permission errors (read-only directories) surface as `Dashboard write skipped` warnings but allow the CLI to complete.

## Temporary Files & Cleanup

- Each test writes to `os.tmpdir()` and removes the directory during teardown.
- The “missing dashboard” test temporarily renames the `dashboard/` directory. It runs with a `try/finally` guard to restore the directory even when an assertion fails.
- No files under `dashboard/server/data/` are modified.

## Troubleshooting

- **`better-sqlite3` build errors**: reinstall dependencies (`npm install`) and ensure Python 3 + build tools are available (macOS Command Line Tools or the equivalent on Linux).
- **Renaming failures**: ensure the dashboard dev server is not running simultaneously; terminate any `npm run dev` dashboard process before re-running tests.
- **Lingering temp directories**: rerun `npm run test:integration` to confirm cleanup, or manually clear `/tmp/dochealth-*` directories if a prior test crash interrupted cleanup.

Keep this document updated whenever new workflow integration cases land so CI and contributors know how to exercise the full stack end-to-end.
