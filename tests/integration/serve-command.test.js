const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');

const { serveDashboard } = require('../../lib/serve');

const DASHBOARD_ROOT = path.join(__dirname, '..', '..', 'dashboard');

function createLoggerStub() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {}
  };
}

function createViteExpressStub() {
  return {
    config: () => {},
    bind: async (_app, server, callback) => {
      callback?.();
      server.once('close', () => server.emit('vite:close'));
    }
  };
}

function listenOn(port = 0) {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

test('serveDashboard starts API server and responds to requests', async () => {
  const runtime = await serveDashboard({
    port: 0,
    dashboardRoot: DASHBOARD_ROOT,
    handleSignals: false,
    viteExpress: createViteExpressStub(),
    logger: createLoggerStub()
  });

  try {
    const response = await fetch(`${runtime.url}/api/health/current`);
    assert.equal(response.status, 404);
    const payload = await response.json();
    assert.equal(payload.status, 'error');
  } finally {
    await runtime.close();
  }
});

test('serveDashboard falls back to the next available port when strictPort is disabled', async () => {
  const busyServer = await listenOn();
  const busyPort = busyServer.address().port;
  let runtime;

  try {
    runtime = await serveDashboard({
      port: busyPort,
      dashboardRoot: DASHBOARD_ROOT,
      handleSignals: false,
      viteExpress: createViteExpressStub(),
      logger: createLoggerStub()
    });

    assert.notEqual(runtime.port, busyPort);
    assert.ok(runtime.port > busyPort);
  } finally {
    await runtime?.close();
    await new Promise(resolve => busyServer.close(resolve));
  }
});

test('serveDashboard throws when strictPort is enabled and port is unavailable', async () => {
  const busyServer = await listenOn();
  const busyPort = busyServer.address().port;

  try {
    await assert.rejects(
      serveDashboard({
        port: busyPort,
        dashboardRoot: DASHBOARD_ROOT,
        strictPort: true,
        handleSignals: false,
        viteExpress: createViteExpressStub(),
        logger: createLoggerStub()
      }),
      new RegExp(String(busyPort))
    );
  } finally {
    await new Promise(resolve => busyServer.close(resolve));
  }
});
