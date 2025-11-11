const { test } = require('node:test');
const assert = require('node:assert');
const {
  analyzeFreshness,
  analyzeCoverage,
  calculateCombinedHealthScore
} = require('../../lib/analyzer');
const {
  generateAPIReferences,
  renderEndpointMarkdown,
  buildEndpointFrontmatter
} = require('../../lib/generators/api-generator');

const manifestFixture = require('../fixtures/api-protocol.json');

function createManifest() {
  const manifest = JSON.parse(JSON.stringify(manifestFixture));
  manifest.maintenance = {
    freshness_check: {
      enabled: true,
      last_code_change_at: '2025-10-01T00:00:00Z',
      last_doc_update: '2025-10-15T00:00:00Z'
    }
  };
  manifest.lifecycle = {
    updated_at: '2025-10-15T00:00:00Z'
  };
  return manifest;
}

function createHealth(manifest) {
  const coverage = analyzeCoverage(manifest, 'api');
  const freshness = analyzeFreshness(manifest);
  const combined = calculateCombinedHealthScore(freshness, coverage);
  return { coverage, freshness, combined };
}

test('renderEndpointMarkdown wraps output in generated-section directives', () => {
  const manifest = createManifest();
  const endpoint = manifest.interface.endpoints[0];
  const health = createHealth(manifest);
  
  const markdown = renderEndpointMarkdown({
    endpoint,
    manifest,
    serviceName: manifest.service.name,
    serviceSlug: 'billing-api',
    semanticId: 'billing-api-list-invoices',
    health
  });
  
  assert.ok(markdown.startsWith('# GET'));
  assert.ok(markdown.includes(':::generated-section'));
  assert.ok(markdown.includes('## Parameters'), 'should include parameters section');
});

test('buildEndpointFrontmatter encodes semantic metadata', () => {
  const manifest = createManifest();
  const endpoint = manifest.interface.endpoints[0];
  const health = createHealth(manifest);
  
  const frontmatter = buildEndpointFrontmatter({
    endpoint,
    manifest,
    serviceSlug: 'billing-api',
    semanticId: 'billing-api-list-invoices',
    health
  });
  
  assert.strictEqual(frontmatter.semanticId, 'billing-api-list-invoices');
  assert.ok(frontmatter.slug.startsWith('/api/billing-api/'));
  assert.ok(Array.isArray(frontmatter.tags));
  assert.strictEqual(frontmatter.service, manifest.service.name);
});

test('generateAPIReferences produces vfiles with frontmatter', async () => {
  const manifest = createManifest();
  const result = await generateAPIReferences(manifest);
  
  assert.ok(result.endpoints.length > 0, 'should generate one file per endpoint');
  const doc = result.endpoints[0];
  assert.ok(doc.content.startsWith('---'));
  assert.ok(doc.content.includes('generated-section'));
  assert.ok(doc.frontmatter.slug.startsWith('/api/'));
  assert.strictEqual(result.performance.sampleSize, 100);
  assert.ok(typeof result.performance.durationMs === 'number');
});
