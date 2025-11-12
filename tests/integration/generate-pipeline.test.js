const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runGeneratorPipeline } = require('../../lib/generator-pipeline');

function buildApiModuleSource() {
  return `
const manifest = {
  service: { name: 'orders', version: '1.0.0' },
  interface: {
    authentication: { type: 'apiKey' },
    endpoints: [
      {
        method: 'GET',
        path: '/v1/orders',
        summary: 'listOrders',
        params: [],
        responses: [{ status: 200, description: 'OK', schema: { type: 'array' } }],
        errors: []
      }
    ]
  },
  metadata: { tags: ['orders'] }
};

function createAPIProtocol() {
  return {
    manifest: () => manifest
  };
}

module.exports = { createAPIProtocol };
`;
}

function buildDataModuleSource() {
  return `
const manifest = {
  dataset: {
    name: 'user_events',
    type: 'fact-table',
    lifecycle: { status: 'active', created_at: '2025-01-01T00:00:00Z' }
  },
  schema: {
    primary_key: 'event_id',
    fields: {
      event_id: { type: 'string', required: true },
      user_id: { type: 'string' }
    }
  },
  catalog: { owner: 'analytics-team', tags: ['events'] },
  operations: { refresh: { schedule: 'hourly', expected_by: '08:00Z' }, retention: '90-days' }
};

function createDataProtocol() {
  return {
    manifest: () => manifest
  };
}

module.exports = { createDataProtocol };
`;
}

function buildWorkflowModuleSource() {
  return `
const manifest = {
  workflow: { id: 'logistics', name: 'Logistics Flow', version: '1.0.0' },
  metadata: { owner: 'ops', tags: ['logistics'] },
  steps: [
    { id: 'start', type: 'event' },
    { id: 'process', type: 'service', dependencies: ['start'] },
    { id: 'approve', type: 'human', dependencies: ['process'], human_task: { outcomes: ['approved'] } }
  ]
};

function createWorkflowProtocol() {
  return {
    manifest: () => manifest
  };
}

module.exports = { createWorkflowProtocol };
`;
}

test('runGeneratorPipeline generates API, data, and workflow outputs', async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'dochealth-pipeline-'));
  const protocolsDir = path.join(workspace, 'protocols');

  try {
    await fs.mkdir(protocolsDir, { recursive: true });
    await fs.writeFile(
      path.join(protocolsDir, 'api_protocol_sample.js'),
      buildApiModuleSource(),
      'utf8'
    );
    await fs.writeFile(
      path.join(protocolsDir, 'data_protocol_sample.js'),
      buildDataModuleSource(),
      'utf8'
    );
    await fs.writeFile(
      path.join(protocolsDir, 'workflow_protocol_sample.js'),
      buildWorkflowModuleSource(),
      'utf8'
    );

    const result = await runGeneratorPipeline({
      types: ['api', 'data', 'workflow'],
      protocolsPath: protocolsDir,
      outputDir: workspace,
      merge: false
    });

    const apiSummary = result.summaries.api;
    assert.ok(apiSummary.documentsWritten > 0, 'expected API docs to be generated');
    const apiDocPath = path.join(workspace, apiSummary.documents[0].relativePath);
    const apiContent = await fs.readFile(apiDocPath, 'utf8');
    assert.match(apiContent, /:::generated-section/, 'API output should include generated section directives');

    const dataSummary = result.summaries.data;
    assert.ok(dataSummary.documentsWritten === 1, 'expected single data catalog document');
    const dataDocPath = path.join(workspace, dataSummary.documents[0].relativePath);
    const dataContent = await fs.readFile(dataDocPath, 'utf8');
    assert.match(dataContent, /dataset/i);

    const workflowSummary = result.summaries.workflow;
    assert.ok(workflowSummary.documentsWritten === 1, 'expected single workflow document');
    const workflowDocPath = path.join(workspace, workflowSummary.documents[0].relativePath);
    const workflowContent = await fs.readFile(workflowDocPath, 'utf8');
    assert.match(workflowContent, /```mermaid/, 'workflow output should contain mermaid diagrams');
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});
