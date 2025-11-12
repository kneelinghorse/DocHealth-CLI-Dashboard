const fs = require('fs').promises;
const path = require('path');

const DEFAULT_STATE_DIR = '.dochealth';
const BASE_SUBDIR = 'base';
const CONFLICT_SUBDIR = 'conflicts';

/**
 * Resolve commonly used filesystem paths for merge state.
 * @param {string} targetPath
 * @param {{root?: string, stateDir?: string}} options
 * @returns {{
 *   root: string,
 *   absoluteTarget: string,
 *   relativeTarget: string,
 *   stateDir: string,
 *   baseDir: string,
 *   conflictDir: string,
 *   basePath: string,
 *   conflictPath: string
 * }}
 */
function resolveStatePaths(targetPath, options = {}) {
  if (!targetPath) {
    throw new Error('Target path is required to resolve DocHealth state directories.');
  }

  const root = path.resolve(options.root || process.cwd());
  const absoluteTarget = path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(root, targetPath);
  const relativeTarget = path.relative(root, absoluteTarget);
  const stateDir = path.resolve(options.stateDir || path.join(root, DEFAULT_STATE_DIR));
  const baseDir = path.join(stateDir, BASE_SUBDIR);
  const conflictDir = path.join(stateDir, CONFLICT_SUBDIR);

  const basePath = path.resolve(baseDir, relativeTarget);
  const conflictPath = path.resolve(conflictDir, `${relativeTarget}.json`);

  if (!basePath.startsWith(baseDir)) {
    throw new Error(`Refusing to store base snapshot outside of ${baseDir}`);
  }
  if (!conflictPath.startsWith(conflictDir)) {
    throw new Error(`Refusing to store conflict metadata outside of ${conflictDir}`);
  }

  return {
    root,
    absoluteTarget,
    relativeTarget,
    stateDir,
    baseDir,
    conflictDir,
    basePath,
    conflictPath
  };
}

async function ensureDirectory(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
}

async function readFileIfExists(target) {
  try {
    return await fs.readFile(target, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Load the stored BASE snapshot for a given document.
 * @param {string} targetPath
 * @param {Object} options
 * @returns {Promise<string|null>}
 */
async function readBase(targetPath, options = {}) {
  const { basePath } = resolveStatePaths(targetPath, options);
  return readFileIfExists(basePath);
}

/**
 * Persist a new BASE snapshot for the provided document.
 * @param {string} targetPath
 * @param {string} content
 * @param {Object} options
 */
async function writeBase(targetPath, content, options = {}) {
  const { baseDir, basePath } = resolveStatePaths(targetPath, options);
  await ensureDirectory(baseDir);
  await fs.mkdir(path.dirname(basePath), { recursive: true });
  await fs.writeFile(basePath, content ?? '', 'utf8');
}

/**
 * Ensure a BASE snapshot exists. If missing, write the fallback content.
 * @param {string} targetPath
 * @param {string} fallbackContent
 * @param {Object} options
 * @returns {Promise<string>} The snapshot contents (existing or fallback)
 */
async function ensureBaseSnapshot(targetPath, fallbackContent, options = {}) {
  const existing = await readBase(targetPath, options);
  if (existing !== null && existing !== undefined) {
    return existing;
  }
  await writeBase(targetPath, fallbackContent ?? '', options);
  return fallbackContent ?? '';
}

module.exports = {
  resolveStatePaths,
  readBase,
  writeBase,
  ensureBaseSnapshot,
  constants: {
    DEFAULT_STATE_DIR,
    BASE_SUBDIR,
    CONFLICT_SUBDIR
  }
};
