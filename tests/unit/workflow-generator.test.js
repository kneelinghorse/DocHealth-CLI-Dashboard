const { test } = require('node:test');
const assert = require('node:assert');
const { validateWorkflowDag } = require('../../lib/generators/dag-validator');
const { generateWorkflowDocs } = require('../../lib/generators/workflow-generator');

const workflowManifestFixture = require('../fixtures/workflow-protocol.json');

function cloneWorkflow() {
  return JSON.parse(JSON.stringify(workflowManifestFixture));
}

function createCycleManifest() {
  const manifest = cloneWorkflow();
  manifest.steps = manifest.steps.slice(0, 3);
  manifest.steps[0].dependencies = ['process_payment'];
  return manifest;
}

function createLargeWorkflowManifest(count = 55) {
  const steps = Array.from({ length: count }).map((_, index) => {
    const id = `node_${index}`;
    const deps = index === 0 ? [] : [`node_${index - 1}`];
    const types = ['service', 'event', 'human', 'decision'];
    return {
      id,
      name: `Node ${index}`,
      type: types[index % types.length],
      description: `Auto-generated node ${index}`,
      dependencies: deps,
      phase: `Phase ${Math.floor(index / 10) + 1}`
    };
  });

  return {
    workflow: {
      id: 'mega-workflow',
      name: 'Mega Workflow',
      version: '1.0.0'
    },
    steps,
    metadata: {
      owner: 'platform-team',
      tags: ['generated', 'stress-test']
    }
  };
}

test('validateWorkflowDag detects cycles', () => {
  const manifest = createCycleManifest();
  const validation = validateWorkflowDag(manifest.steps);
  assert.ok(validation.hasCycle, 'should detect cycle');
  assert.ok(validation.cycleNodes.length > 0);
});

test('generateWorkflowDocs produces mermaid diagrams for valid workflows', async () => {
  const manifest = cloneWorkflow();
  const generation = await generateWorkflowDocs(manifest);
  const doc = generation.document.content;
  assert.ok(doc.startsWith('---'), 'frontmatter should be present');
  assert.ok(doc.includes('```mermaid'), 'should include mermaid block');
  assert.ok(doc.includes('%%{init: {"layout": "elk"'), 'should enable ELK layout');
});

test('generateWorkflowDocs emits danger admonition when cycles exist', async () => {
  const manifest = createCycleManifest();
  const generation = await generateWorkflowDocs(manifest);
  assert.ok(generation.document.content.includes(':::danger'), 'should warn about cycles');
});

test('generateWorkflowDocs handles 50+ node workflows with benchmarking', async () => {
  const manifest = createLargeWorkflowManifest(60);
  const generation = await generateWorkflowDocs(manifest);
  assert.strictEqual(generation.performance.sampleSize, 100);
  assert.ok(generation.document.content.includes('node_59'), 'should include last node');
});
