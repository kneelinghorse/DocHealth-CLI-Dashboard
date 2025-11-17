const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const { writeToDashboard } = require('../../lib/dashboard-writer');
const analysisFixture = require('../fixtures/dashboard-analysis-fixture.json');

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DASHBOARD_ROOT = path.join(PROJECT_ROOT, 'dashboard');

async function setupTestDatabase() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dochealth-dashboard-'));
  const dbPath = path.join(tempDir, 'dochealth.sqlite');
  return { tempDir, dbPath };
}

async function teardownTestDatabase(tempDir) {
  await fs.rm(tempDir, { recursive: true, force: true });
}

async function executeCLICheck({ dbPath, extraArgs = [], writeToDashboardFlag = true } = {}) {
  const args = [
    'bin/dochealth.js',
    'check',
    '--path',
    './src',
    '--threshold',
    '0',
    '--json',
    '--no-color'
  ];

  if (writeToDashboardFlag) {
    args.push('--write-db');
    if (typeof dbPath === 'string') {
      args.push(dbPath);
    }
  }

  if (extraArgs.length) {
    args.push(...extraArgs);
  }

  return execFileAsync('node', args, {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      FORCE_COLOR: '0'
    },
    maxBuffer: 20 * 1024 * 1024
  });
}

async function importDashboardModule(relativePath) {
  const modulePath = path.join(DASHBOARD_ROOT, relativePath);
  const moduleUrl = pathToFileURL(modulePath).href;
  return import(moduleUrl);
}

async function createRepository(dbPath) {
  const { createDefaultRepository } = await importDashboardModule('server/db/healthRepository.js');
  return createDefaultRepository(dbPath);
}

async function startDashboardServer(dbPath) {
  const repository = await createRepository(dbPath);
  const { createServer } = await importDashboardModule('server/server.js');
  const app = createServer({ repository });
  const server = await listen(app);
  const port = server.address().port;

  return {
    url: `http://127.0.0.1:${port}`,
    async close() {
      await closeServer(server);
      if (repository?.db && typeof repository.db.close === 'function') {
        repository.db.close();
      }
    }
  };
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildFixturePayload() {
  const fixture = clone(analysisFixture);
  const protocolSources = fixture.protocolSources.map(source => ({
    ...source,
    path: path.join(PROJECT_ROOT, source.path)
  }));
  return {
    healthScore: fixture.healthScore,
    analysisResults: fixture.analysisResults,
    protocolSources
  };
}

async function runWithDashboardRenamed(callback) {
  const backupPath = `${DASHBOARD_ROOT}.backup-${Date.now()}`;
  await fs.rename(DASHBOARD_ROOT, backupPath);
  try {
    return await callback();
  } finally {
    await fs.rename(backupPath, DASHBOARD_ROOT);
  }
}

async function ensureDirectoryWritable(targetDir) {
  await fs.chmod(targetDir, 0o755);
}

test(
  'CLI check writes dashboard DB and exposes /api/health/current',
  { timeout: 120000 },
  async () => {
    const { tempDir, dbPath } = await setupTestDatabase();
    let runtime;
    try {
      await executeCLICheck({ dbPath });

      const repository = await createRepository(dbPath);
      const latestRun = repository.getLatestRun();
      repository.db.close();

      assert.ok(latestRun, 'expected at least one analysis run');
      assert.ok(latestRun.snapshots.length > 0, 'expected protocol snapshots to be recorded');

      runtime = await startDashboardServer(dbPath);
      const response = await fetch(`${runtime.url}/api/health/current`);
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.status, 'ok');
      assert.equal(payload.result.totalProtocols, latestRun.total_protocols_analyzed);
      assert.equal(payload.result.protocols.length, latestRun.snapshots.length);
      assert.ok(
        payload.result.protocols.every(protocol => typeof protocol.protocolName === 'string')
      );
    } finally {
      await runtime?.close();
      await teardownTestDatabase(tempDir);
    }
  }
);

test('Dashboard history endpoint returns the requested window', { timeout: 120000 }, async () => {
  const { tempDir, dbPath } = await setupTestDatabase();
  let runtime;
  try {
    await executeCLICheck({ dbPath });
    await delay(1100);
    await executeCLICheck({ dbPath });

    runtime = await startDashboardServer(dbPath);
    const response = await fetch(`${runtime.url}/api/health/history?days=2`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.status, 'ok');
    assert.equal(payload.window.days, 2);
    assert.equal(payload.runs.length, 2);

    const timestamps = payload.runs.map(run => run.runTimestamp);
    assert.ok(timestamps[0] >= timestamps[1], 'history should be sorted by recency');
  } finally {
    await runtime?.close();
    await teardownTestDatabase(tempDir);
  }
});

test('writeToDashboard preserves CLI analysis fields', { timeout: 60000 }, async () => {
  const { tempDir, dbPath } = await setupTestDatabase();
  try {
    const payload = buildFixturePayload();
    await writeToDashboard({
      ...payload,
      dbPath,
      dashboardRoot: DASHBOARD_ROOT,
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {}
      }
    });

    const repository = await createRepository(dbPath);
    const run = repository.getLatestRun();
    repository.db.close();

    assert.equal(run.total_protocols_analyzed, payload.analysisResults.total);
    assert.equal(run.snapshots.length, payload.analysisResults.protocols.length);

    run.snapshots.forEach((snapshot, index) => {
      const protocol = payload.analysisResults.protocols[index];
      assert.equal(snapshot.protocolName, protocol.id);
      assert.equal(snapshot.healthScore, protocol.combined.healthScore);
      const { id: protocolId, ...rawWithoutId } = protocol;
      void protocolId;
      assert.deepEqual(snapshot.rawAnalysisOutput, rawWithoutId);
    });

    const storedPaths = run.snapshots.map(snapshot => snapshot.filePath);
    assert.ok(storedPaths.every(filePath => filePath.startsWith('src/')));
  } finally {
    await teardownTestDatabase(tempDir);
  }
});

test('CLI warns when the dashboard workspace is missing', { timeout: 120000 }, async () => {
  const { tempDir, dbPath } = await setupTestDatabase();
  try {
    const result = await runWithDashboardRenamed(() => executeCLICheck({ dbPath }));
    assert.match(result.stderr, /Dashboard write skipped/);
  } finally {
    await teardownTestDatabase(tempDir);
  }
});

test(
  'CLI reports database permission issues without aborting the workflow',
  { timeout: 120000 },
  async () => {
    const readOnlyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dochealth-ro-'));
    const dbPath = path.join(readOnlyDir, 'dochealth.sqlite');

    try {
      await fs.chmod(readOnlyDir, 0o555);
      const result = await executeCLICheck({ dbPath });
      assert.match(result.stderr, /Dashboard write skipped: Unable to open dashboard database/);
    } finally {
      await ensureDirectoryWritable(readOnlyDir);
      await fs.rm(readOnlyDir, { recursive: true, force: true });
    }
  }
);
