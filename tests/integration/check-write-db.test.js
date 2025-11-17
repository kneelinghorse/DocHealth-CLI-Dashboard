const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DASHBOARD_ROOT = path.join(PROJECT_ROOT, 'dashboard');

async function runCheckWithWriteDb(targetDbPath) {
  await execFileAsync(
    'node',
    ['bin/dochealth.js', 'check', '--path', './src', '--threshold', '0', '--json', '--write-db', targetDbPath],
    {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        FORCE_COLOR: '0'
      },
      maxBuffer: 20 * 1024 * 1024
    }
  );
}

async function importDashboardModule(relativePath) {
  const modulePath = path.join(DASHBOARD_ROOT, relativePath);
  const url = pathToFileURL(modulePath).href;
  return import(url);
}

async function createRepository(dbPath) {
  const { createDefaultRepository } = await importDashboardModule('server/db/healthRepository.js');
  return createDefaultRepository(dbPath);
}

async function createDashboardApp(repository) {
  const { createServer } = await importDashboardModule('server/server.js');
  return createServer({ repository });
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function closeServer(server) {
  return new Promise(resolve => server.close(resolve));
}

test('dochealth check --write-db populates dashboard SQLite database and API', { timeout: 120000 }, async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dochealth-write-db-'));
  const dbPath = path.join(tempDir, 'dochealth.sqlite');
  let repository;
  let server;

  try {
    await runCheckWithWriteDb(dbPath);

    repository = await createRepository(dbPath);
    const latestRun = repository.getLatestRun();
    assert.ok(latestRun, 'expected at least one run to be recorded');
    assert.ok(latestRun.total_protocols_analyzed > 0);
    assert.equal(latestRun.snapshots.length, latestRun.total_protocols_analyzed);

    const app = await createDashboardApp(repository);
    server = await listen(app);

    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/health/current`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.status, 'ok');
    assert.equal(payload.result.totalProtocols, latestRun.total_protocols_analyzed);
    assert.equal(payload.result.overallHealthScore, latestRun.overall_health_score);
    assert.ok(Array.isArray(payload.result.protocols));
    assert.equal(payload.result.protocols.length, latestRun.snapshots.length);
  } finally {
    if (server) {
      await closeServer(server);
    }
    if (repository?.db && typeof repository.db.close === 'function') {
      repository.db.close();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
