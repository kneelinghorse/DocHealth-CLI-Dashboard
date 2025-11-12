const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { mergeDocuments } = require('../../lib/merge/ast-merger');

const BASE_DOC = `# Title

:::generated-section{#alpha data-kind="endpoint"}
## Summary
Alpha section
:::

:::generated-section{#beta}
## Summary
Beta section
:::
`;

function withHumanNote(markdown, note = '> Human insight') {
  return markdown.replace(
    ':::\n\n:::generated-section{#beta',
    `:::\n\n${note}\n\n:::generated-section{#beta`
  );
}

test('mergeDocuments reorders sections while preserving human content', async () => {
  const base = BASE_DOC;
  const local = withHumanNote(base);
  const remote = `# Title v2

:::generated-section{#beta}
## Summary
Beta refreshed
:::

:::generated-section{#alpha data-kind="endpoint"}
## Summary
Alpha refreshed
:::
`;

  const result = await mergeDocuments({
    baseContent: base,
    localContent: local,
    remoteContent: remote,
    filePath: path.join(__dirname, 'alpha.md')
  });

  assert.strictEqual(result.conflicts.length, 0);
  assert.ok(result.mergedContent.includes('Title v2'));
  const noteIndex = result.mergedContent.indexOf('> Human insight');
  const alphaIndex = result.mergedContent.indexOf('Alpha refreshed');
  assert.ok(
    noteIndex > -1 && noteIndex > alphaIndex,
    'Human note should follow the alpha section after reorder'
  );
});

test('mergeDocuments flags user edits within generated section', async () => {
  const base = BASE_DOC;
  const local = base.replace('Alpha section', 'Alpha section (edited)');
  const remote = base;

  const result = await mergeDocuments({
    baseContent: base,
    localContent: local,
    remoteContent: remote,
    filePath: path.join(__dirname, 'alpha-edit.md')
  });

  assert.strictEqual(result.conflicts.length, 1);
  assert.strictEqual(result.conflicts[0].id, 'alpha');
  assert.strictEqual(result.conflicts[0].type, 'modify-modify');
  assert.ok(result.mergedContent.includes('Alpha section (edited)'), 'Local edits stay in place');
});

test('mergeDocuments flags orphaned content when generator deletes a section', async () => {
  const base = BASE_DOC;
  const local = base;
  const remote = base.replace(
    '\n:::generated-section{#beta}\n## Summary\nBeta section\n:::\n',
    '\n'
  );

  const result = await mergeDocuments({
    baseContent: base,
    localContent: local,
    remoteContent: remote,
    filePath: path.join(__dirname, 'beta-delete.md')
  });

  assert.strictEqual(result.conflicts.length, 1);
  assert.strictEqual(result.conflicts[0].id, 'beta');
  assert.strictEqual(result.conflicts[0].type, 'orphaned-content');
});

test('mergeDocuments can auto-accept generator output', async () => {
  const base = BASE_DOC;
  const local = base.replace('Beta section', 'Beta edits');
  const remote = base.replace('Beta section', 'Beta regenerated');

  const result = await mergeDocuments({
    baseContent: base,
    localContent: local,
    remoteContent: remote,
    filePath: path.join(__dirname, 'auto.md'),
    autoAcceptTheirs: true
  });

  assert.strictEqual(result.conflicts.length, 0);
  assert.ok(result.mergedContent.includes('Beta regenerated'));
});
