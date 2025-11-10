/**
 * Unit tests for lib/loader.js
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs').promises;
const {
  loadProtocols,
  loadProtocol,
  validateProtocol,
  detectProtocolType,
  clearCache,
  getCacheStats,
  PROTOCOL_PATTERNS,
  PROTOCOL_FACTORIES
} = require('../../lib/loader');

const SRC_DIR = path.join(__dirname, '../../src');

test('detectProtocolType - should detect API protocol', () => {
  const type = detectProtocolType('api_protocol_v_1_1_1.js');
  assert.strictEqual(type, 'api');
});

test('detectProtocolType - should detect Data protocol', () => {
  const type = detectProtocolType('data_protocol_v_1_1_1.js');
  assert.strictEqual(type, 'data');
});

test('detectProtocolType - should detect Docs protocol', () => {
  const type = detectProtocolType('Documentation Protocol — v1.1.1.js');
  assert.strictEqual(type, 'docs');
});

test('detectProtocolType - should detect Semantic protocol', () => {
  const type = detectProtocolType('Semantic Protocol — v3.2.0.js');
  assert.strictEqual(type, 'semantic');
});

test('detectProtocolType - should detect Workflow protocol', () => {
  const type = detectProtocolType('workflow_protocol_v_1_1_1.js');
  assert.strictEqual(type, 'workflow');
});

test('detectProtocolType - should return null for unknown file', () => {
  const type = detectProtocolType('unknown_file.js');
  assert.strictEqual(type, null);
});

test('loadProtocol - should load a single protocol successfully', async () => {
  const apiPath = path.join(SRC_DIR, 'api_protocol_v_1_1_1.js');
  const result = await loadProtocol(apiPath);
  
  assert.ok(!result.error, `Should not have error: ${result.error?.message}`);
  assert.ok(result.protocol, 'Should have protocol instance');
  assert.strictEqual(result.type, 'api');
  assert.strictEqual(typeof result.protocol.manifest, 'function');
  assert.strictEqual(typeof result.protocol.validate, 'function');
});

test('loadProtocol - should handle missing file', async () => {
  const missingPath = path.join(SRC_DIR, 'nonexistent_protocol.js');
  const result = await loadProtocol(missingPath);
  
  assert.ok(result.error, 'Should have error for missing file');
  assert.strictEqual(result.error.code, 'ENOENT');
});

test('loadProtocol - should cache loaded protocols', async () => {
  clearCache();
  
  const apiPath = path.join(SRC_DIR, 'api_protocol_v_1_1_1.js');
  
  // First load
  const result1 = await loadProtocol(apiPath);
  const stats1 = getCacheStats();
  
  // Second load (should use cache)
  const result2 = await loadProtocol(apiPath);
  const stats2 = getCacheStats();
  
  assert.strictEqual(stats1.size, 1, 'Cache should have 1 entry after first load');
  assert.strictEqual(stats2.size, 1, 'Cache should still have 1 entry');
  assert.ok(result1.protocol === result2.protocol, 'Should return same cached instance');
});

test('loadProtocols - should load all protocols from src directory', async () => {
  clearCache();
  
  const results = await loadProtocols(SRC_DIR);
  
  assert.ok(results.protocols.length > 0, 'Should load at least one protocol');
  assert.strictEqual(results.stats.total, results.protocols.length + results.errors.length);
  assert.strictEqual(results.stats.successful, results.protocols.length);
  
  // Should have loaded multiple protocol types
  const types = results.protocols.map(p => p.type);
  assert.ok(types.includes('api'), 'Should have API protocol');
  assert.ok(types.includes('data'), 'Should have Data protocol');
  assert.ok(types.includes('docs'), 'Should have Docs protocol');
  assert.ok(types.includes('semantic'), 'Should have Semantic protocol');
  assert.ok(types.includes('workflow'), 'Should have Workflow protocol');
});

test('loadProtocols - should handle invalid directory', async () => {
  const results = await loadProtocols('/nonexistent/directory');
  
  assert.strictEqual(results.protocols.length, 0);
  assert.ok(results.errors.length > 0, 'Should have errors');
  assert.ok(results.errors[0].message.includes('directory') || results.errors[0].code === 'ENOENT');
});

test('loadProtocols - should collect errors for invalid protocols', async () => {
  // Create a temporary invalid protocol file with a valid protocol name
  // but invalid content (missing factory function)
  const tempDir = path.join(__dirname, '../fixtures/temp');
  const tempFile = path.join(tempDir, 'api_protocol_invalid.js');
  
  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(tempFile, 'module.exports = { invalid: "protocol" };');
    
    const results = await loadProtocols(tempDir);
    
    assert.strictEqual(results.errors.length, 1, 'Should have error for invalid protocol');
    assert.ok(results.errors[0].message.includes('Factory function'), 'Should mention missing factory');
    
  } finally {
    // Cleanup
    try {
      await fs.unlink(tempFile);
      await fs.rmdir(tempDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
});

test('validateProtocol - should validate a loaded protocol', async () => {
  const apiPath = path.join(SRC_DIR, 'api_protocol_v_1_1_1.js');
  const result = await loadProtocol(apiPath);
  
  const validation = validateProtocol(result.protocol);
  
  assert.ok(validation.ok !== undefined, 'Validation should have ok property');
  assert.ok(Array.isArray(validation.results) || validation.error, 'Should have results or error');
});

test('validateProtocol - should handle invalid protocol', () => {
  const invalidProtocol = { manifest: () => ({}) }; // Missing validate method
  
  const validation = validateProtocol(invalidProtocol);
  
  assert.strictEqual(validation.ok, false);
  assert.ok(validation.error, 'Should have error message');
});

test('PROTOCOL_PATTERNS - should have all expected protocol types', () => {
  const expectedTypes = ['api', 'data', 'docs', 'semantic', 'workflow', 'event', 'identity', 'ui', 'agent'];
  
  for (const type of expectedTypes) {
    assert.ok(PROTOCOL_PATTERNS[type], `Should have pattern for ${type}`);
    assert.ok(PROTOCOL_PATTERNS[type] instanceof RegExp, `Pattern for ${type} should be RegExp`);
  }
});

test('PROTOCOL_FACTORIES - should have matching factory functions', () => {
  const types = Object.keys(PROTOCOL_PATTERNS);
  
  for (const type of types) {
    assert.ok(PROTOCOL_FACTORIES[type], `Should have factory for ${type}`);
    assert.strictEqual(typeof PROTOCOL_FACTORIES[type], 'string');
    assert.ok(PROTOCOL_FACTORIES[type].startsWith('create'), 'Factory name should start with create');
  }
});

test('clearCache - should clear all cached protocols', () => {
  // Load something first
  const apiPath = path.join(SRC_DIR, 'api_protocol_v_1_1_1.js');
  loadProtocol(apiPath);
  
  const beforeStats = getCacheStats();
  assert.ok(beforeStats.size > 0, 'Cache should have entries');
  
  clearCache();
  
  const afterStats = getCacheStats();
  assert.strictEqual(afterStats.size, 0, 'Cache should be empty after clear');
});

test('getCacheStats - should return cache statistics', () => {
  clearCache();
  
  const stats = getCacheStats();
  
  assert.strictEqual(typeof stats.size, 'number');
  assert.ok(Array.isArray(stats.entries));
  assert.strictEqual(stats.size, 0);
  assert.strictEqual(stats.entries.length, 0);
});