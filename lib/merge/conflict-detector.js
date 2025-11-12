const fs = require('fs').promises;
const path = require('path');
const { resolveStatePaths } = require('./base-storage');

const CONFLICT_TYPES = {
  MODIFY_MODIFY: 'modify-modify',
  ORPHANED_CONTENT: 'orphaned-content',
  USER_DELETED: 'user-deleted'
};

/**
 * Determine whether a section requires manual intervention.
 * @param {Object} args
 * @param {string} args.id
 * @param {boolean} args.hasBase
 * @param {boolean} args.hasLocal
 * @param {boolean} args.hasRemote
 * @param {string} args.baseText
 * @param {string} args.localText
 * @param {string} args.remoteText
 * @returns {Object|null}
 */
function detectSectionConflict({
  id,
  hasBase,
  hasLocal,
  hasRemote,
  baseText = '',
  localText = '',
  remoteText = ''
}) {
  if (!hasBase && hasLocal && !hasRemote) {
    // User-authored directive with no generator equivalent—treat as human-owned.
    return null;
  }

  if (hasBase && !hasRemote && hasLocal) {
    return createConflictPayload({
      id,
      type: CONFLICT_TYPES.ORPHANED_CONTENT,
      message: 'Generator removed this section but local copy still exists.',
      baseText,
      localText,
      remoteText
    });
  }

  if (hasBase && hasRemote && !hasLocal) {
    return createConflictPayload({
      id,
      type: CONFLICT_TYPES.USER_DELETED,
      message: 'Local document deleted a generator-owned section.',
      baseText,
      localText,
      remoteText
    });
  }

  if (!hasBase || !hasRemote) {
    // Newly generated section (no base reference) – always safe.
    return null;
  }

  const localChanged = hasLocal ? localText !== baseText : false;
  const remoteChanged = hasRemote ? remoteText !== baseText : false;

  if (!localChanged) {
    return null;
  }

  if (!remoteChanged) {
    return createConflictPayload({
      id,
      type: CONFLICT_TYPES.MODIFY_MODIFY,
      message: 'Local edits detected inside generated block.',
      baseText,
      localText,
      remoteText
    });
  }

  if (localText === remoteText) {
    return null;
  }

  return createConflictPayload({
    id,
    type: CONFLICT_TYPES.MODIFY_MODIFY,
    message: 'Generator and local edits both touched this section.',
    baseText,
    localText,
    remoteText
  });
}

function createConflictPayload({ id, type, message, baseText, localText, remoteText }) {
  return {
    id,
    type,
    message,
    baseText: baseText ?? '',
    localText: localText ?? '',
    remoteText: remoteText ?? ''
  };
}

/**
 * Persist conflict metadata so dochealth resolve can replay decisions.
 * @param {string} targetPath
 * @param {Object} record
 * @param {Object} options
 */
async function saveConflictRecord(targetPath, record, options = {}) {
  const { conflictDir, conflictPath } = resolveStatePaths(targetPath, options);
  await fs.mkdir(conflictDir, { recursive: true });
  await fs.mkdir(path.dirname(conflictPath), { recursive: true });
  await fs.writeFile(conflictPath, JSON.stringify(record, null, 2), 'utf8');
}

async function loadConflictRecord(targetPath, options = {}) {
  const { conflictPath } = resolveStatePaths(targetPath, options);
  try {
    const raw = await fs.readFile(conflictPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function clearConflictRecord(targetPath, options = {}) {
  const { conflictPath } = resolveStatePaths(targetPath, options);
  try {
    await fs.unlink(conflictPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = {
  CONFLICT_TYPES,
  detectSectionConflict,
  createConflictPayload,
  saveConflictRecord,
  loadConflictRecord,
  clearConflictRecord
};
