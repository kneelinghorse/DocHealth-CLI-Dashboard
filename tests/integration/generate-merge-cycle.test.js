const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { runGeneratorPipeline } = require('../../lib/generator-pipeline');

function buildDataModuleSource() {
  return `
const manifest = {
  dataset: {
    name: 'orders_dataset',
    type: 'fact-table',
    lifecycle: { status: 'active', created_at: '2025-01-01T00:00:00Z' }
  },
  schema: {
    primary_key: 'id',
    fields: {
      id: { type: 'string', required: true },
      amount: { type: 'number' }
    }
  },
  catalog: { owner: 'data-eng', tags: ['orders'] },
  operations: { refresh: { schedule: 'daily', expected_by: '08:00Z' }, retention: '1-year' }
};

function createDataProtocol() {
  return { manifest: () => manifest };
}

module.exports = { createDataProtocol };
`;
}

async function fileExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

test('generator pipeline preserves human edits via merge conflicts on regeneration', async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'dochealth-merge-'));
  const outputDir = path.join(workspace, 'docs');
  const protocolsDir = path.join(workspace, 'protocols');

  try {
    await fs.mkdir(protocolsDir, { recursive: true });
    await fs.writeFile(
      path.join(protocolsDir, 'data_protocol_fixture.js'),
      buildDataModuleSource(),
      'utf8'
    );

    const initialRun = await runGeneratorPipeline({
      types: ['data'],
      protocolsPath: protocolsDir,
      outputDir,
      merge: true,
      mergeRoot: workspace
    });

    const dataSummary = initialRun.summaries.data;
    assert.ok(dataSummary.documentsWritten === 1, 'expected a single data document');
    const docRelativePath = dataSummary.documents[0].relativePath;
    const docPath = path.join(outputDir, docRelativePath);

    let content = await fs.readFile(docPath, 'utf8');
    content = content.replace(
      '## Schema',
      '## Schema\n\n### Human note\nDo not overwrite this section.'
    );
    await fs.writeFile(docPath, content, 'utf8');

    const secondRun = await runGeneratorPipeline({
      types: ['data'],
      protocolsPath: protocolsDir,
      outputDir,
      merge: true,
      mergeRoot: workspace
    });

    const conflictRelative = path.join('docs', docRelativePath);
    const conflictPath = path.join(
      workspace,
      '.dochealth',
      'conflicts',
      `${conflictRelative}.json`
    );
    assert.ok(
      await fileExists(conflictPath),
      'expected merge conflict metadata to be written for edited file'
    );

    const conflictRecord = JSON.parse(await fs.readFile(conflictPath, 'utf8'));
    assert.ok(conflictRecord.conflicts.length > 0, 'conflict record should enumerate sections');
    assert.ok(
      secondRun.summaries.data.conflicts > 0,
      'pipeline summary should record conflicts'
    );

    const mergedContent = await fs.readFile(docPath, 'utf8');
    assert.match(
      mergedContent,
      /Human note/,
      'human edits should persist when conflicts require manual resolution'
    );
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});
