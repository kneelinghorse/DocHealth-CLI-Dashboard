/**
 * Protocol Loader - Auto-discover and load protocol manifests
 * 
 * Handles loading of protocol files from directory, validation,
 * type detection, and caching with file change invalidation.
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

// Cache for loaded protocols
const protocolCache = new Map();

/**
 * Protocol type detection patterns
 */
const PROTOCOL_PATTERNS = {
  api: /api[_\s-]?protocol.*\.js$/i,
  data: /data[_\s-]?protocol.*\.js$/i,
  docs: /documentation.*protocol.*\.js$/i,
  semantic: /semantic.*protocol.*\.js$/i,
  workflow: /workflow[_\s-]?protocol.*\.js$/i,
  event: /event[_\s-]?protocol.*\.js$/i,
  identity: /identity.*protocol.*\.js$/i,
  ui: /ui[_\s-]?component[_\s-]?protocol.*\.js$/i,
  agent: /agent[_\s-]?protocol.*\.js$/i
};

/**
 * Factory function names for each protocol type
 */
const PROTOCOL_FACTORIES = {
  api: 'createAPIProtocol',
  data: 'createDataProtocol',
  docs: 'createDocsProtocol',
  semantic: 'createSemanticProtocol',
  workflow: 'createWorkflowProtocol',
  event: 'createEventProtocol',
  identity: 'createIdentityProtocol',
  ui: 'createUIComponentProtocol',
  agent: 'createAgentProtocol'
};

/**
 * Detect protocol type from filename
 * @param {string} filename - Name of the file
 * @returns {string|null} - Protocol type or null if unknown
 */
function detectProtocolType(filename) {
  const basename = path.basename(filename);
  for (const [type, pattern] of Object.entries(PROTOCOL_PATTERNS)) {
    if (pattern.test(basename)) {
      return type;
    }
  }
  return null;
}

/**
 * Load a single protocol from file path
 * @param {string} filePath - Absolute path to protocol file
 * @returns {Promise<Object>} - Protocol instance or error object
 */
async function loadProtocol(filePath) {
  try {
    // Check if file exists
    const stats = await fs.stat(filePath);
    
    // Check cache first
    const cacheKey = filePath;
    const cached = protocolCache.get(cacheKey);
    
    if (cached && cached.mtime >= stats.mtime) {
      // Cache is valid, return cached protocol
      return { protocol: cached.protocol, type: cached.type };
    }
    
    // Load the module
    const module = require(filePath);
    
    // Detect protocol type
    const type = detectProtocolType(filePath);
    if (!type) {
      throw new Error(`Unable to detect protocol type for: ${filePath}`);
    }
    
    // Get the appropriate factory function
    const factoryName = PROTOCOL_FACTORIES[type];
    const factory = module[factoryName] || module.default;
    
    if (typeof factory !== 'function') {
      throw new Error(`Factory function '${factoryName}' not found in ${filePath}`);
    }
    
    // Create protocol instance (pass empty manifest, protocols should have defaults)
    const protocol = factory({});
    
    // Verify protocol has required methods
    if (typeof protocol.manifest !== 'function') {
      throw new Error(`Protocol from ${filePath} missing required 'manifest()' method`);
    }
    
    // Cache the loaded protocol
    protocolCache.set(cacheKey, {
      protocol,
      type,
      mtime: stats.mtime,
      path: filePath
    });
    
    return { protocol, type };
    
  } catch (error) {
    return {
      error: {
        path: filePath,
        message: error.message,
        code: error.code
      }
    };
  }
}

/**
 * Load all protocols from a directory
 * @param {string} dirPath - Directory to search for protocols
 * @param {Object} options - Loading options
 * @param {Array} options.patterns - Custom glob patterns (optional)
 * @param {boolean} options.recursive - Search recursively (default: true)
 * @returns {Promise<Object>} - { protocols: Array, errors: Array, stats: Object }
 */
async function loadProtocols(dirPath, options = {}) {
  const {
    patterns = null,
    recursive = true
  } = options;
  
  const results = {
    protocols: [],
    errors: [],
    stats: {
      total: 0,
      successful: 0,
      failed: 0,
      byType: {}
    }
  };
  
  try {
    // Ensure directory exists
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${dirPath}`);
    }
    
    // Determine search patterns
    let searchPatterns;
    if (patterns) {
      searchPatterns = patterns;
    } else {
      // Use simplified glob patterns based on protocol naming conventions
      searchPatterns = '**/*protocol*.js';
    }
    
    // Find all protocol files (using sync version since glob v7 is callback-based)
    const files = glob.sync(searchPatterns, {
      cwd: dirPath,
      absolute: true,
      ignore: ['node_modules/**'],
      nocase: true,
      nodir: true
    });
    
    // Ensure files is an array
    const fileList = Array.isArray(files) ? files : [];
    
    results.stats.total = fileList.length;
    
    // Load each protocol
    for (const filePath of fileList) {
      const result = await loadProtocol(filePath);
      
      if (result.error) {
        results.errors.push(result.error);
        results.stats.failed++;
      } else {
        results.protocols.push({
          protocol: result.protocol,
          type: result.type,
          path: filePath
        });
        
        results.stats.successful++;
        results.stats.byType[result.type] = (results.stats.byType[result.type] || 0) + 1;
      }
    }
    
  } catch (error) {
    results.errors.push({
      path: dirPath,
      message: error.message,
      code: error.code
    });
  }
  
  return results;
}

/**
 * Validate a protocol using its built-in validators
 * @param {Object} protocol - Protocol instance
 * @param {Array} validatorNames - Specific validator names to run (optional)
 * @returns {Object} - Validation results
 */
function validateProtocol(protocol, validatorNames = []) {
  if (!protocol || typeof protocol.validate !== 'function') {
    return {
      ok: false,
      error: 'Protocol does not have validate method'
    };
  }
  
  try {
    const validation = protocol.validate(validatorNames);
    return validation;
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

/**
 * Clear the protocol cache
 * @param {string} filePath - Specific file to clear from cache (optional)
 */
function clearCache(filePath) {
  if (filePath) {
    protocolCache.delete(filePath);
  } else {
    protocolCache.clear();
  }
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
function getCacheStats() {
  return {
    size: protocolCache.size,
    entries: Array.from(protocolCache.keys())
  };
}

module.exports = {
  loadProtocols,
  loadProtocol,
  validateProtocol,
  detectProtocolType,
  clearCache,
  getCacheStats,
  PROTOCOL_PATTERNS,
  PROTOCOL_FACTORIES
};