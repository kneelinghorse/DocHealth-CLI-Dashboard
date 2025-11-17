'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEFAULT_DASHBOARD_ROOT = path.join(__dirname, '..', 'dashboard');
const DEFAULT_DB_RELATIVE = path.join('server', 'data', 'dochealth.sqlite');

class DashboardWriterError extends Error {
  constructor(message, code = 'DASHBOARD_WRITE_FAILED') {
    super(message);
    this.name = 'DashboardWriterError';
    this.code = code;
  }
}

function resolveDashboardPaths({ dbPath, dashboardRoot } = {}) {
  const resolvedRoot = path.resolve(dashboardRoot || DEFAULT_DASHBOARD_ROOT);
  const resolvedDbPath = path.resolve(dbPath || path.join(resolvedRoot, DEFAULT_DB_RELATIVE));
  return { dashboardRoot: resolvedRoot, dbPath: resolvedDbPath };
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function loadHealthRepositoryModule(dashboardRoot) {
  const modulePath = path.join(dashboardRoot, 'server', 'db', 'healthRepository.js');
  const url = pathToFileURL(modulePath).href;
  try {
    return await import(url);
  } catch (error) {
    throw new DashboardWriterError(
      `Unable to load HealthRepository from ${modulePath}: ${error.message}`,
      'MODULE_LOAD_FAILED'
    );
  }
}

function normalizeLogger(logger) {
  if (!logger) {
    return {
      info: () => {},
      warn: () => {},
      error: () => {}
    };
  }
  return {
    info: typeof logger.info === 'function' ? logger.info.bind(logger) : () => {},
    warn: typeof logger.warn === 'function' ? logger.warn.bind(logger) : () => {},
    error: typeof logger.error === 'function' ? logger.error.bind(logger) : () => {}
  };
}

function buildProtocolSnapshots(analysisProtocols = [], protocolSources = []) {
  return analysisProtocols
    .map((protocol, index) => {
      if (!protocol) {
        return null;
      }

      const source = protocolSources[index];
      const filePath = source?.path ? path.relative(process.cwd(), source.path) : null;
      const snapshot = {
        protocolName: protocol.id || `protocol_${index + 1}`,
        filePath,
        healthScore: protocol.combined?.healthScore ?? protocol.combined?.combinedScore ?? 0,
        protocolType: protocol.type || source?.type || 'unknown',
        analysis: {
          type: protocol.type || source?.type || 'unknown',
          freshness: protocol.freshness,
          coverage: protocol.coverage,
          combined: protocol.combined
        }
      };

      if (!snapshot.protocolName) {
        return null;
      }

      return snapshot;
    })
    .filter(Boolean);
}

/**
 * Determine if the dashboard workspace and repository module are present.
 * @param {Object} options - Path configuration
 * @param {string} [options.dbPath] - Database path (unused, included for parity)
 * @param {string} [options.dashboardRoot] - Dashboard root directory
 * @returns {Promise<boolean>}
 */
async function isDashboardAccessible(options = {}) {
  const { dashboardRoot: resolvedRoot } = resolveDashboardPaths(options);
  if (!(await fileExists(resolvedRoot))) {
    return false;
  }
  const repoPath = path.join(resolvedRoot, 'server', 'db', 'healthRepository.js');
  return fileExists(repoPath);
}

/**
 * Write CLI analysis results to the dashboard SQLite database.
 * @param {Object} options - Writer configuration
 * @param {Object} options.healthScore - Result from calculateHealthScore()
 * @param {Object} options.analysisResults - Result from analyzeMultipleProtocols()
 * @param {Array} options.protocolSources - Array of loaded protocol descriptors from loader
 * @param {string} [options.dbPath] - Custom database path
 * @param {string} [options.dashboardRoot] - Dashboard workspace location
 * @param {Object} [options.logger] - Logger with info/warn/error
 * @returns {Promise<Object>} - Summary of the recorded run
 */
async function writeToDashboard({
  healthScore,
  analysisResults,
  protocolSources = [],
  dbPath,
  dashboardRoot,
  logger
}) {
  const log = normalizeLogger(logger);
  const { dashboardRoot: resolvedRoot, dbPath: resolvedDbPath } = resolveDashboardPaths({
    dbPath,
    dashboardRoot
  });

  const accessible = await isDashboardAccessible({ dbPath: resolvedDbPath, dashboardRoot: resolvedRoot });
  if (!accessible) {
    throw new DashboardWriterError(
      'Dashboard workspace not found. Use --write-db <path> to specify an existing database.',
      'DASHBOARD_UNAVAILABLE'
    );
  }

  if (!analysisResults?.protocols?.length) {
    throw new DashboardWriterError('No analysis results available to persist.', 'EMPTY_ANALYSIS');
  }

  const snapshots = buildProtocolSnapshots(analysisResults.protocols, protocolSources);
  if (!snapshots.length) {
    throw new DashboardWriterError('No protocol snapshots to persist.', 'EMPTY_SNAPSHOTS');
  }

  const runTimestamp = new Date().toISOString();
  const parsedScore = Number.parseFloat(healthScore?.overallScore ?? 0);
  const payload = {
    runTimestamp,
    overallHealthScore: Number.isFinite(parsedScore) ? parsedScore : 0,
    totalProtocolsAnalyzed: analysisResults.total ?? snapshots.length,
    protocols: snapshots
  };

  const module = await loadHealthRepositoryModule(resolvedRoot);
  const factory = module?.createDefaultRepository;
  if (typeof factory !== 'function') {
    throw new DashboardWriterError('HealthRepository factory not available.', 'INVALID_REPOSITORY_MODULE');
  }

  let repository;
  try {
    repository = factory(resolvedDbPath);
  } catch (error) {
    throw new DashboardWriterError(
      `Unable to open dashboard database at ${resolvedDbPath}: ${error.message}`,
      'DB_INIT_FAILED'
    );
  }

  try {
    const result = repository.recordAnalysisRun(payload);
    log.info(`Dashboard database updated at ${resolvedDbPath}`);
    return {
      success: true,
      runId: result.runId,
      runTimestamp,
      protocolsCount: snapshots.length,
      dbPath: resolvedDbPath
    };
  } catch (error) {
    throw new DashboardWriterError(
      `Failed to record analysis run: ${error.message}`,
      'DB_WRITE_FAILED'
    );
  } finally {
    if (repository?.db && typeof repository.db.close === 'function') {
      try {
        repository.db.close();
      } catch (closeError) {
        log.warn(`Failed to close dashboard database: ${closeError.message}`);
      }
    }
  }
}

module.exports = {
  writeToDashboard,
  isDashboardAccessible,
  DashboardWriterError,
  DEFAULT_DASHBOARD_ROOT,
  DEFAULT_DB_RELATIVE
};
