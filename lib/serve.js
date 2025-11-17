'use strict';

const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { pathToFileURL } = require('node:url');

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '127.0.0.1';
const FALLBACK_ATTEMPTS = 15;

async function pathExists(target) {
  try {
    await fs.promises.access(target, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function assertDashboardWorkspace(dashboardRoot) {
  const stats = await fs.promises
    .stat(dashboardRoot)
    .catch(() => null);
  if (!stats || !stats.isDirectory()) {
    throw new Error(`Dashboard workspace not found at ${dashboardRoot}`);
  }

  const packageJsonPath = path.join(dashboardRoot, 'package.json');
  if (!(await pathExists(packageJsonPath))) {
    throw new Error(
      'Missing dashboard/package.json. Did you remove the dashboard workspace?'
    );
  }

  const nodeModulesPath = path.join(dashboardRoot, 'node_modules');
  if (!(await pathExists(nodeModulesPath))) {
    throw new Error(
      'Dashboard dependencies are missing. Run `npm install` inside the dashboard/ directory.'
    );
  }

  const viteConfigPath = path.join(dashboardRoot, 'vite.config.js');
  if (!(await pathExists(viteConfigPath))) {
    throw new Error(
      'Unable to locate dashboard/vite.config.js. The serve command requires the dashboard build configuration.'
    );
  }
}

async function importDashboardModule(dashboardRoot, relativePath) {
  const fullPath = path.join(dashboardRoot, relativePath);
  if (!(await pathExists(fullPath))) {
    throw new Error(`Cannot find required dashboard file: ${relativePath}`);
  }
  return import(pathToFileURL(fullPath).href);
}

async function createRepository(dashboardRoot, dbPath) {
  const { createDefaultRepository } = await importDashboardModule(
    path.join(dashboardRoot, 'server'),
    'db/healthRepository.js'
  );
  return createDefaultRepository(dbPath);
}

function normalizeMode(mode) {
  const value = (mode || process.env.NODE_ENV || 'development').toLowerCase();
  return value === 'production' ? 'production' : 'development';
}

function resolveDashboardRoot(input) {
  if (input) {
    return path.resolve(input);
  }
  return path.resolve(__dirname, '..', 'dashboard');
}

function resolveDatabasePath(dashboardRoot, dbPath) {
  if (dbPath) {
    return path.resolve(dbPath);
  }
  return path.join(dashboardRoot, 'server', 'data', 'dochealth.sqlite');
}

function resolveHost(host) {
  if (!host) {
    return DEFAULT_HOST;
  }
  return host;
}

async function isPortAvailable(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer().once('error', error => {
      if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
        resolve(false);
      } else {
        reject(error);
      }
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function findAvailablePort({
  preferred,
  host,
  strictPort = false,
  attempts = FALLBACK_ATTEMPTS
}) {
  if (!preferred || preferred <= 0) {
    return { port: 0, reason: 'ephemeral' };
  }

  let candidate = preferred;
  for (let index = 0; index < attempts; index += 1, candidate += 1) {
    const free = await isPortAvailable(candidate, host);
    if (free) {
      return { port: candidate, reason: candidate === preferred ? 'preferred' : 'fallback' };
    }
    if (strictPort) {
      const error = new Error(`Port ${preferred} is not available on host ${host}`);
      error.code = 'EADDRINUSE';
      throw error;
    }
  }

  throw new Error(
    `Unable to find a free port after checking ${attempts} slots from ${preferred}`
  );
}

function createLogger(logger) {
  if (!logger) {
    return console;
  }
  return {
    info: logger.info ? logger.info.bind(logger) : console.log,
    warn: logger.warn ? logger.warn.bind(logger) : console.warn,
    error: logger.error ? logger.error.bind(logger) : console.error
  };
}

function formatDisplayHost(host) {
  return host === '0.0.0.0' ? 'localhost' : host;
}

function registerSignalHandlers({ shutdown, logger }) {
  const signals = ['SIGINT', 'SIGTERM'];
  const handlers = signals.map(signal => {
    const handler = async () => {
      logger.info(`Received ${signal}. Shutting down DocHealth server...`);
      try {
        await shutdown(signal);
        process.exit(0);
      } catch (error) {
        logger.error('Failed to shut down DocHealth server cleanly', error);
        process.exit(1);
      }
    };
    process.once(signal, handler);
    return { signal, handler };
  });

  return () => {
    handlers.forEach(({ signal, handler }) => {
      process.removeListener(signal, handler);
    });
  };
}

async function serveDashboard(userOptions = {}) {
  const options = {
    port: userOptions.port ?? DEFAULT_PORT,
    host: resolveHost(userOptions.host),
    strictPort: Boolean(userOptions.strictPort),
    dashboardRoot: resolveDashboardRoot(userOptions.dashboardRoot),
    dbPath: userOptions.dbPath,
    mode: userOptions.mode,
    handleSignals: userOptions.handleSignals !== false,
    viteExpress: userOptions.viteExpress,
    logger: createLogger(userOptions.logger)
  };

  await assertDashboardWorkspace(options.dashboardRoot);

  const resolvedDbPath = resolveDatabasePath(options.dashboardRoot, options.dbPath);
  const repository = await createRepository(options.dashboardRoot, resolvedDbPath);

  const { createServer } = await importDashboardModule(
    path.join(options.dashboardRoot, 'server'),
    'server.js'
  );
  const app = createServer({ repository });

  const normalizedMode = normalizeMode(options.mode);
  process.env.NODE_ENV = normalizedMode;

  const ViteExpress = options.viteExpress || require('vite-express');
  ViteExpress.config({
    mode: normalizedMode,
    viteConfigFile: path.join(options.dashboardRoot, 'vite.config.js')
  });

  const portChoice = await findAvailablePort({
    preferred: Number(options.port),
    host: options.host,
    strictPort: options.strictPort
  });

  if (portChoice.reason === 'fallback') {
    options.logger.warn(
      `Requested port ${options.port} is in use. Switching to ${portChoice.port}.`
    );
  }

  const server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(portChoice.port, options.host, async () => {
      try {
        await ViteExpress.bind(app, server, () => {
          options.logger.info(
            `DocHealth dashboard available at http://${formatDisplayHost(options.host)}:${server.address().port}`
          );
          options.logger.info(`SQLite database: ${resolvedDbPath}`);
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });

  server.on('error', error => {
    options.logger.error('DocHealth serve encountered an error', error);
  });

  let closed = false;
  const closeServer = async () => {
    if (closed) {
      return;
    }
    closed = true;
    await new Promise((resolve, reject) => {
      server.close(error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    if (repository?.db && typeof repository.db.close === 'function') {
      repository.db.close();
    }
  };

  let removeSignalHandlers = () => {};
  if (options.handleSignals) {
    removeSignalHandlers = registerSignalHandlers({
      shutdown: closeServer,
      logger: options.logger
    });
  }

  server.on('vite:close', removeSignalHandlers);

  return {
    port: server.address().port,
    host: options.host,
    url: `http://${formatDisplayHost(options.host)}:${server.address().port}`,
    server,
    repository,
    close: async () => {
      removeSignalHandlers();
      await closeServer();
    }
  };
}

module.exports = {
  serveDashboard
};
