const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runGeneratorPipeline } = require('../../lib/generator-pipeline');

function buildBulkApiSource(count) {
  const endpoints = Array.from({ length: count }, (_, index) => {
    return `{
      method: 'GET',
      path: '/v1/items/${index}',
      summary: 'get-item-${index}',
      params: [],
      responses: [{ status: 200, description: 'OK', schema: { type: 'object' } }],
      errors: []
    }`;
  }).join(',\n');

  return `
const manifest = {
  service: { name: 'bulk-benchmark', version: '1.0.0' },
  interface: {
    authentication: { type: 'apiKey' },
    endpoints: [
      ${endpoints}
    ]
  },
  metadata: { tags: ['benchmark'] }
};

function createAPIProtocol() {
  return {
    manifest: () => manifest
  };
}

module.exports = { createAPIProtocol };
`;
}

test('generator pipeline handles 1000 endpoint benchmark with concurrency', async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'dochealth-benchmark-'));
  const protocolsDir = path.join(workspace, 'protocols');
  const outputDir = path.join(workspace, 'docs');

  try {
    await fs.mkdir(protocolsDir, { recursive: true });
    const protocolPath = path.join(protocolsDir, 'api_protocol_bulk.js');
    await fs.writeFile(protocolPath, buildBulkApiSource(1000), 'utf8');

    const result = await runGeneratorPipeline({
      types: ['api'],
      protocolsPath: protocolsDir,
      outputDir,
      merge: false
    });

    const apiSummary = result.summaries.api;
    assert.strictEqual(
      apiSummary.documentsWritten,
      1000,
      'should generate the expected number of API files'
    );
    assert.strictEqual(apiSummary.created, 1000);
    assert.ok(
      apiSummary.protocolSummaries[0].performance.metTarget,
      'stage 1 benchmark should stay under the configured target'
    );

    const sampleDoc = path.join(outputDir, apiSummary.documents[0].relativePath);
    const sampleContent = await fs.readFile(sampleDoc, 'utf8');
    assert.match(sampleContent, /generated-section/, 'generated Markdown should exist on disk');
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});
