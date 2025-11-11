const { test } = require('node:test');
const assert = require('node:assert');
const {
  analyzeFreshness,
  analyzeCoverage,
  calculateCombinedHealthScore
} = require('../../lib/analyzer');
const {
  renderDatasetMarkdown,
  buildDatasetFrontmatter,
  generateDataCatalogDocs
} = require('../../lib/generators/data-generator');

const dataManifestFixture = require('../fixtures/data-protocol.json');

function createDataManifest() {
  const manifest = JSON.parse(JSON.stringify(dataManifestFixture));
  manifest.maintenance = {
    freshness_check: {
      enabled: true,
      last_code_change_at: '2025-11-01T00:00:00Z',
      last_doc_update: '2025-11-05T00:00:00Z'
    }
  };
  manifest.lifecycle = {
    updated_at: '2025-11-05T00:00:00Z'
  };
  manifest.dataset = manifest.dataset || {};
  manifest.dataset.lifecycle = manifest.dataset.lifecycle || { status: 'active' };
  return manifest;
}

function createHealth(manifest) {
  const coverage = analyzeCoverage(manifest, 'data');
  const freshness = analyzeFreshness(manifest);
  const combined = calculateCombinedHealthScore(freshness, coverage);
  return { coverage, freshness, combined };
}

const semanticIds = {
  base: 'dataset-user-events',
  overview: 'dataset-user-events-overview',
  schema: 'dataset-user-events-schema',
  keys: 'dataset-user-events-keys',
  lineage: 'dataset-user-events-lineage',
  catalog: 'dataset-user-events-catalog',
  governance: 'dataset-user-events-governance',
  quality: 'dataset-user-events-quality',
  health: 'dataset-user-events-health',
  operations: 'dataset-user-events-operations'
};

test('renderDatasetMarkdown emits schema tables and directives', () => {
  const manifest = createDataManifest();
  const markdown = renderDatasetMarkdown({
    manifest,
    datasetSlug: 'user-events',
    semanticIds,
    health: createHealth(manifest)
  });

  assert.ok(markdown.startsWith('# Dataset:'), 'should render dataset heading');
  assert.ok(markdown.includes(':::generated-section{#dataset-user-events'), 'should wrap content in directive with semantic id');
  assert.ok(markdown.includes('## Schema'), 'should include schema section');
  assert.ok(markdown.includes('| Field | Type | Required |'), 'should include field table headers');
});

test('buildDatasetFrontmatter encodes dataset metadata', () => {
  const manifest = createDataManifest();
  const health = createHealth(manifest);
  const frontmatter = buildDatasetFrontmatter({
    manifest,
    datasetSlug: 'user-events',
    semanticIds,
    health
  });

  assert.strictEqual(frontmatter.slug, '/data/user-events');
  assert.strictEqual(frontmatter.semanticId, 'dataset-user-events');
  assert.strictEqual(frontmatter.datasetType, manifest.dataset.type);
  assert.ok(Array.isArray(frontmatter.tags));
  assert.ok(Object.prototype.hasOwnProperty.call(frontmatter, 'piiFieldCount'));
});

test('generateDataCatalogDocs creates markdown with frontmatter and benchmark data', async () => {
  const manifest = createDataManifest();
  const result = await generateDataCatalogDocs(manifest);

  assert.strictEqual(result.document.fileName, 'user-events.md');
  assert.ok(result.document.content.startsWith('---'), 'frontmatter should be present');
  assert.ok(result.document.content.includes('generated-section'), 'content should retain directive wrappers');
  assert.strictEqual(result.performance.sampleSize, 100);
  assert.ok(Number.isFinite(result.performance.durationMs));
});
