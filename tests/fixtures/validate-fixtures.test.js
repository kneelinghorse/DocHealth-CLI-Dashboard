import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import protocol factories
import { createDocsProtocol } from '../../src/Documentation Protocol — v1.1.1.js';
import { createAPIProtocol } from '../../src/api_protocol_v_1_1_1.js';
import { createDataProtocol } from '../../src/data_protocol_v_1_1_1.js';
import { createWorkflowProtocol } from '../../src/workflow_protocol_v_1_1_1.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = __dirname;

function loadFixture(filename) {
  const filepath = join(fixturesDir, filename);
  const content = readFileSync(filepath, 'utf8');
  return JSON.parse(content);
}

test('Fresh docs fixture validates correctly', () => {
  const manifest = loadFixture('fresh-docs.json');
  const protocol = createDocsProtocol(manifest);
  const validation = protocol.validate();
  
  assert.ok(validation.ok, 'Fresh docs fixture should pass validation');
  assert.strictEqual(validation.results.length, 5, 'Should run all validators');
  
  // Check that freshness check is properly configured
  const freshnessCheck = manifest.maintenance?.freshness_check;
  assert.ok(freshnessCheck?.enabled, 'Freshness check should be enabled');
  assert.ok(freshnessCheck?.last_code_change_at, 'Should have code change timestamp');
  assert.ok(freshnessCheck?.source_code_path, 'Should have source code path');
  
  // Verify timestamps are the same day
  const docUpdated = new Date(manifest.documentation.lifecycle.updated_at);
  const codeChanged = new Date(freshnessCheck.last_code_change_at);
  const sameDay = docUpdated.toDateString() === codeChanged.toDateString();
  assert.ok(sameDay, 'Docs and code should be updated on the same day');
});

test('Stale docs fixture validates correctly', () => {
  const manifest = loadFixture('stale-docs.json');
  const protocol = createDocsProtocol(manifest);
  const validation = protocol.validate();
  
  assert.ok(validation.ok, 'Stale docs fixture should pass validation');
  
  // Check freshness detection
  const outdated = protocol.findOutdated(30);
  assert.ok(outdated.length > 0, 'Should detect stale documentation');
  
  const staleIssue = outdated.find(issue => issue.status === 'potentially_stale');
  assert.ok(staleIssue, 'Should identify potentially stale docs');
  
  // Verify the time difference
  const docUpdated = new Date(manifest.documentation.lifecycle.updated_at);
  const codeChanged = new Date(manifest.maintenance.freshness_check.last_code_change_at);
  const daysDiff = (codeChanged - docUpdated) / (1000 * 60 * 60 * 24);
  assert.ok(daysDiff > 30, 'Code should be significantly newer than docs');
});

test('Missing timestamps fixture validates correctly', () => {
  const manifest = loadFixture('missing-timestamps.json');
  const protocol = createDocsProtocol(manifest);
  const validation = protocol.validate();
  
  assert.ok(validation.ok, 'Missing timestamps fixture should pass validation');
  
  // Check that freshness check is disabled
  const freshnessCheck = manifest.maintenance?.freshness_check;
  assert.ok(!freshnessCheck?.enabled, 'Freshness check should be disabled');
  
  // Verify missing timestamps
  assert.ok(!manifest.documentation.lifecycle.updated_at, 'Should not have updated_at timestamp');
  assert.ok(!manifest.documentation.lifecycle.created_at, 'Should not have created_at timestamp');
  
  // Check coverage analysis
  const coverage = protocol.analyzeCoverage();
  assert.ok(coverage.estimated_coverage < 50, 'Should have low coverage score');
});

test('API protocol fixture validates correctly', () => {
  const manifest = loadFixture('api-protocol.json');
  const protocol = createAPIProtocol(manifest);
  const validation = protocol.validate();
  
  assert.ok(validation.ok, 'API protocol fixture should pass validation');
  assert.strictEqual(validation.results.length, 4, 'Should run all API validators');
  
  // Check service name
  assert.ok(manifest.service.name, 'Should have service name');
  assert.ok(manifest.interface.endpoints.length > 0, 'Should have endpoints');
  
  // Check authentication
  const auth = manifest.interface.authentication;
  assert.ok(auth.type === 'oauth2', 'Should use OAuth2 authentication');
  assert.ok(auth.scopes.length > 0, 'Should have authentication scopes');
  
  // Check rate limits
  assert.ok(manifest.operations.rate_limits.length > 0, 'Should have rate limits');
});

test('Data protocol fixture validates correctly', () => {
  const manifest = loadFixture('data-protocol.json');
  const protocol = createDataProtocol(manifest);
  const validation = protocol.validate();
  
  assert.ok(validation.ok, 'Data protocol fixture should pass validation');
  assert.strictEqual(validation.results.length, 4, 'Should run all data validators');
  
  // Check dataset properties
  assert.ok(manifest.dataset.name, 'Should have dataset name');
  assert.ok(manifest.dataset.type === 'fact-table', 'Should be a fact table');
  assert.ok(manifest.schema.fields, 'Should have schema fields');
  
  // Check field count
  const fieldCount = Object.keys(manifest.schema.fields).length;
  assert.ok(fieldCount > 10, 'Should have multiple fields');
  
  // Check lineage
  assert.ok(manifest.lineage.sources.length > 0, 'Should have source lineage');
  assert.ok(manifest.lineage.consumers.length > 0, 'Should have consumer lineage');
  
  // Check governance
  assert.ok(manifest.governance.policy.classification, 'Should have classification');
  assert.ok(manifest.governance.storage_residency.encrypted_at_rest, 'Should be encrypted');
});

test('Workflow protocol fixture validates correctly', () => {
  const manifest = loadFixture('workflow-protocol.json');
  const protocol = createWorkflowProtocol(manifest);
  const validation = protocol.validate();
  
  assert.ok(validation.ok, 'Workflow protocol fixture should pass validation');
  assert.strictEqual(validation.results.length, 6, 'Should run all workflow validators');
  
  // Check workflow properties
  assert.ok(manifest.workflow.id, 'Should have workflow ID');
  assert.ok(manifest.workflow.purpose, 'Should have workflow purpose');
  assert.ok(manifest.steps.length > 5, 'Should have multiple steps');
  
  // Check step types
  const stepTypes = manifest.steps.map(s => s.type);
  assert.ok(stepTypes.includes('service'), 'Should have service steps');
  assert.ok(stepTypes.includes('human'), 'Should have human steps');
  assert.ok(stepTypes.includes('event'), 'Should have event steps');
  
  // Check dependencies
  const stepsWithDeps = manifest.steps.filter(s => s.dependencies && s.dependencies.length > 0);
  assert.ok(stepsWithDeps.length > 0, 'Should have steps with dependencies');
  
  // Check SLA
  assert.ok(manifest.sla.timeout, 'Should have SLA timeout');
  assert.ok(manifest.sla.on_timeout_event, 'Should have timeout event');
  
  // Check human task configuration
  const humanSteps = manifest.steps.filter(s => s.type === 'human');
  assert.ok(humanSteps.length > 0, 'Should have human steps');
  assert.ok(humanSteps[0].human_task.outcomes.length > 0, 'Human steps should have outcomes');
});

test('All fixtures have valid URNs in links', () => {
  const docsManifest = loadFixture('fresh-docs.json');
  const docsProtocol = createDocsProtocol(docsManifest);
  const urnValidation = docsProtocol.validate(['links.urns']);
  
  assert.ok(urnValidation.ok, 'URNs in fresh docs should be valid');
  
  // Check specific URN patterns
  const targets = docsManifest.links.targets;
  for (const urn of targets) {
    assert.ok(urn.startsWith('urn:proto:'), 'URN should start with urn:proto:');
    assert.ok(urn.includes('@'), 'URN should include version with @');
  }
});

test('Fixtures cover different freshness scenarios', () => {
  const freshManifest = loadFixture('fresh-docs.json');
  const staleManifest = loadFixture('stale-docs.json');
  const missingManifest = loadFixture('missing-timestamps.json');
  
  const freshProtocol = createDocsProtocol(freshManifest);
  const staleProtocol = createDocsProtocol(staleManifest);
  const missingProtocol = createDocsProtocol(missingManifest);
  
  // Fresh docs should not be outdated
  const freshOutdated = freshProtocol.findOutdated(30);
  assert.strictEqual(freshOutdated.length, 0, 'Fresh docs should not be outdated');
  
  // Stale docs should be outdated
  const staleOutdated = staleProtocol.findOutdated(30);
  assert.ok(staleOutdated.length > 0, 'Stale docs should be outdated');
  
  // Missing timestamps should handle gracefully
  const missingOutdated = missingProtocol.findOutdated(30);
  assert.ok(Array.isArray(missingOutdated), 'Should handle missing timestamps gracefully');
});

test('Coverage analysis works for all fixtures', () => {
  const fixtures = [
    'fresh-docs.json',
    'stale-docs.json',
    'missing-timestamps.json'
  ];
  
  for (const fixture of fixtures) {
    const manifest = loadFixture(fixture);
    const protocol = createDocsProtocol(manifest);
    const coverage = protocol.analyzeCoverage();
    
    assert.ok(coverage.navCount !== undefined, 'Should have nav count');
    assert.ok(coverage.secCount !== undefined, 'Should have section count');
    assert.ok(coverage.estimated_coverage !== undefined, 'Should have coverage percentage');
    assert.ok(coverage.estimated_coverage >= 0 && coverage.estimated_coverage <= 100, 'Coverage should be 0-100');
  }
});