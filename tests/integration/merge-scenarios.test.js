const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('node:child_process');
const { resolveStatePaths } = require('../../lib/merge/base-storage');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const TMP_ROOT = path.join(PROJECT_ROOT, 'tmp/merge-tests');

const BASE_MARKDOWN = `# Sample Doc

:::generated-section{#one}
## Summary
One base
:::

:::generated-section{#two}
## Summary
Two base
:::
`;

function withHumanBlock(markdown) {
  return markdown.replace(
    ':::\n\n:::generated-section{#two}',
    ':::\n\n> human annotation\n\n:::generated-section{#two}'
  );
}

async function runDochealth(args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['bin/dochealth.js', ...args], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => (stdout += chunk));
    child.stderr.on('data', chunk => (stderr += chunk));
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

async function prepareCase(subdir, { localContent, remoteContent }) {
  const caseDir = path.join(TMP_ROOT, subdir);
  await fs.rm(caseDir, { recursive: true, force: true });
  await fs.mkdir(caseDir, { recursive: true });

  const localPath = path.join(caseDir, 'doc.md');
  const remotePath = path.join(caseDir, 'doc.generated.md');
  await fs.writeFile(localPath, localContent, 'utf8');
  await fs.writeFile(remotePath, remoteContent, 'utf8');

  return {
    caseDir,
    localPath,
    remotePath,
    localRel: path.relative(PROJECT_ROOT, localPath),
    remoteRel: path.relative(PROJECT_ROOT, remotePath)
  };
}

async function cleanupState(filePath) {
  const paths = resolveStatePaths(filePath, { root: PROJECT_ROOT });
  await fs.rm(path.dirname(paths.basePath), { recursive: true, force: true }).catch(() => {});
  await fs.rm(path.dirname(paths.conflictPath), { recursive: true, force: true }).catch(() => {});
}

test('merge CLI scenarios', async t => {
  await fs.mkdir(TMP_ROOT, { recursive: true });

  await t.test('handles rename without conflicts', async () => {
    const caseData = await prepareCase('rename', {
      localContent: BASE_MARKDOWN,
      remoteContent: BASE_MARKDOWN.replace('# Sample Doc', '# Sample Doc v2')
    });

    try {
      const result = await runDochealth([
        'merge-docs',
        '--local',
        caseData.localRel,
        '--remote',
        caseData.remoteRel
      ]);

      assert.strictEqual(result.code, 0);
      const merged = await fs.readFile(caseData.localPath, 'utf8');
      assert.ok(merged.includes('Sample Doc v2'), 'Heading should update to new title');
    } finally {
      await cleanupState(caseData.localPath);
      await fs.rm(caseData.caseDir, { recursive: true, force: true });
    }
  });

  await t.test('preserves human content during reorder', async () => {
    const remote = `# Sample Doc

:::generated-section{#two}
## Summary
Two regenerated
:::

:::generated-section{#one}
## Summary
One regenerated
:::
`;
    const caseData = await prepareCase('reorder', {
      localContent: withHumanBlock(BASE_MARKDOWN),
      remoteContent: remote
    });

    try {
      const result = await runDochealth([
        'merge-docs',
        '--local',
        caseData.localRel,
        '--remote',
        caseData.remoteRel
      ]);
      assert.strictEqual(result.code, 0);
      const merged = await fs.readFile(caseData.localPath, 'utf8');
      assert.ok(merged.includes('Two regenerated'));
      const noteIndex = merged.indexOf('> human annotation');
      const sectionIndex = merged.indexOf('One regenerated');
      assert.ok(
        noteIndex > sectionIndex,
        'Human annotation should still trail section #one even after reorder'
      );
    } finally {
      await cleanupState(caseData.localPath);
      await fs.rm(caseData.caseDir, { recursive: true, force: true });
    }
  });

  await t.test('captures deletion conflicts for manual resolution', async () => {
    const remote = BASE_MARKDOWN.replace(
      '\n:::generated-section{#two}\n## Summary\nTwo base\n:::\n',
      '\n'
    );
    const caseData = await prepareCase('deletion', {
      localContent: BASE_MARKDOWN,
      remoteContent: remote
    });

    try {
      const result = await runDochealth([
        'merge-docs',
        '--local',
        caseData.localRel,
        '--remote',
        caseData.remoteRel
      ]);

      assert.strictEqual(result.code, 1);
      const paths = resolveStatePaths(caseData.localPath, { root: PROJECT_ROOT });
      const conflictRaw = await fs.readFile(paths.conflictPath, 'utf8');
      const conflict = JSON.parse(conflictRaw);
      assert.strictEqual(conflict.conflicts.length, 1);
      assert.strictEqual(conflict.conflicts[0].type, 'orphaned-content');
    } finally {
      await cleanupState(caseData.localPath);
      await fs.rm(caseData.caseDir, { recursive: true, force: true });
    }
  });
});
