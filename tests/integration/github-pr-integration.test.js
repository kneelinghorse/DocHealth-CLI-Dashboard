const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { calculateHealthDelta } = require('../../lib/github/health-delta');
const { formatPRComment, COMMENT_IDENTIFIER } = require('../../lib/github/comment-formatter');
const { runPRCommentWorkflow } = require('../../lib/github/pr-comment');

function buildReport({ score, protocols }) {
  return {
    timestamp: '2025-02-01T00:00:00.000Z',
    health: { score },
    details: { protocols }
  };
}

function buildProtocol(id, { stale, severity, daysStale, hasTimestamps = true, coverage = 100, total = 10, documented = 10 }) {
  return {
    id,
    freshness: {
      isStale: stale,
      severity,
      daysStale,
      hasTimestamps,
      enabled: true
    },
    coverage: {
      coveragePercentage: coverage,
      totalItems: total,
      documentedItems: documented,
      missingDocumentation: []
    }
  };
}

function createTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'dochealth-pr-'));
}

async function writeReport(dir, filename, content) {
  const target = path.join(dir, filename);
  await fs.writeFile(target, JSON.stringify(content, null, 2));
  return target;
}

function createStubOctokit({ comments = [] } = {}) {
  const calls = { created: 0, updated: 0 };
  return {
    rest: {
      pulls: {
        get: async () => ({
          data: {
            html_url: 'https://github.com/acme/dochealth/pull/7',
            base: { sha: '1111111', ref: 'main' },
            head: { sha: '2222222', ref: 'feature/pr' }
          }
        })
      },
      issues: {
        listComments: async () => ({ data: comments }),
        updateComment: async ({ comment_id, body }) => {
          calls.updated += 1;
          return {
            data: { id: comment_id, html_url: `https://comments/${comment_id}`, body }
          };
        },
        createComment: async ({ body }) => {
          calls.created += 1;
          return {
            data: { id: 999, html_url: 'https://comments/999', body }
          };
        }
      }
    },
    paginate: async fn => {
      const response = await fn();
      return response.data;
    },
    calls
  };
}

function createAuthFailureOctokit(error) {
  return {
    rest: {
      pulls: {
        get: async () => {
          throw error;
        }
      },
      issues: {
        listComments: async () => ({ data: [] }),
        updateComment: async () => ({ data: {} }),
        createComment: async () => ({ data: {} })
      }
    },
    paginate: async fn => {
      const response = await fn();
      return response.data;
    }
  };
}

function createRateLimitOctokit(error) {
  return {
    rest: {
      pulls: {
        get: async () => ({
          data: {
            html_url: 'https://github.com/acme/dochealth/pull/10',
            base: { sha: '1111111', ref: 'main' },
            head: { sha: '2222222', ref: 'feature/pr' }
          }
        })
      },
      issues: {
        listComments: async () => ({ data: [] }),
        updateComment: async () => ({ data: {} }),
        createComment: async () => {
          throw error;
        }
      }
    },
    paginate: async fn => {
      const response = await fn();
      return response.data;
    }
  };
}

test('calculateHealthDelta detects new and resolved issues', () => {
  const beforeReport = buildReport({
    score: 70,
    protocols: [
      buildProtocol('api.orders', { stale: true, severity: 'high', daysStale: 35, coverage: 82 }),
      buildProtocol('workflow.fulfillment', {
        stale: false,
        severity: 'low',
        daysStale: 0,
        coverage: 45,
        hasTimestamps: false
      })
    ]
  });

  const afterReport = buildReport({
    score: 81,
    protocols: [
      buildProtocol('api.orders', { stale: false, severity: 'low', daysStale: 0, coverage: 90 }),
      buildProtocol('workflow.fulfillment', { stale: false, severity: 'low', daysStale: 0, coverage: 75 })
    ]
  });

  const delta = calculateHealthDelta(beforeReport, afterReport, {});
  assert.equal(delta.beforeScore, 70);
  assert.equal(delta.afterScore, 81);
  assert.equal(delta.issues.newIssues.length, 0);
  assert.ok(delta.issues.resolvedIssues.find(issue => issue.protocolId === 'api.orders'));
  assert.equal(delta.issues.afterTotal, 1);
  assert.equal(delta.issues.beforeTotal, 3);
});

test('formatPRComment outputs markdown summary and identifier', () => {
  const delta = {
    beforeScore: 70,
    afterScore: 80,
    scoreChange: 10,
    issues: {
      beforeTotal: 3,
      afterTotal: 1,
      severity: {
        critical: { before: 1, after: 0, delta: -1 },
        high: { before: 1, after: 0, delta: -1 },
        medium: { before: 1, after: 1, delta: 0 },
        low: { before: 0, after: 0, delta: 0 }
      },
      newIssues: [],
      resolvedIssues: [{ protocolId: 'workflow.fulfillment', description: '45% coverage', severity: 'high' }],
      remaining: [{ protocolId: 'data.events', description: '75% coverage', severity: 'medium' }]
    },
    beforeTimestamp: '2025-02-01T00:00:00Z',
    afterTimestamp: '2025-02-02T00:00:00Z'
  };

  const markdown = formatPRComment(delta, {
    repo: 'acme/docs',
    prNumber: 42,
    baseSha: 'abc1234',
    headSha: 'def5678',
    identifier: COMMENT_IDENTIFIER
  });

  assert.match(markdown, /DocHealth Health Delta/);
  assert.match(markdown, /\| Health Score | 70 | 80 | \+10 |/);
  assert.match(markdown, /<details>/);
  assert.ok(markdown.trim().endsWith(COMMENT_IDENTIFIER));
});

test('runPRCommentWorkflow updates an existing sticky comment', async () => {
  const tempDir = await createTempDir();
  try {
    const beforeReport = buildReport({
      score: 70,
      protocols: [buildProtocol('api.orders', { stale: true, severity: 'high', daysStale: 30, coverage: 82 })]
    });
    const afterReport = buildReport({
      score: 75,
      protocols: [buildProtocol('api.orders', { stale: false, severity: 'low', daysStale: 0, coverage: 82 })]
    });

    const beforePath = await writeReport(tempDir, 'before.json', beforeReport);
    const afterPath = await writeReport(tempDir, 'after.json', afterReport);

    const octokit = createStubOctokit({
      comments: [
        {
          id: 500,
          body: `${COMMENT_IDENTIFIER}\nold comment`
        }
      ]
    });

    const result = await runPRCommentWorkflow({
      repo: 'acme/dochealth',
      prNumber: 5,
      beforeReportPath: beforePath,
      afterReportPath: afterPath,
      identifier: COMMENT_IDENTIFIER,
      octokit
    });

    assert.equal(result.comment.action, 'updated');
    assert.equal(octokit.calls.updated, 1);
    assert.equal(result.delta.issues.resolvedIssues.length, 1);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('runPRCommentWorkflow supports offline dry-run metadata overrides', async () => {
  const tempDir = await createTempDir();
  try {
    const beforeReport = buildReport({ score: 68, protocols: [] });
    const afterReport = buildReport({ score: 72, protocols: [] });

    const beforePath = await writeReport(tempDir, 'before.json', beforeReport);
    const afterPath = await writeReport(tempDir, 'after.json', afterReport);

    const result = await runPRCommentWorkflow({
      repo: 'acme/dochealth',
      prNumber: 8,
      beforeReportPath: beforePath,
      afterReportPath: afterPath,
      dryRun: true,
      baseSha: 'aaaaaaaa',
      headSha: 'bbbbbbbb',
      baseRef: 'main',
      headRef: 'feature/github-pr-docs',
      pullRequestUrl: 'https://github.com/acme/dochealth/pull/8'
    });

    assert.equal(result.dryRun, true);
    assert.equal(result.pullRequest.base.sha, 'aaaaaaaa');
    assert.equal(result.pullRequest.head.sha, 'bbbbbbbb');
    assert.match(result.commentBody, /DocHealth Health Delta/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('runPRCommentWorkflow surfaces authentication failures with actionable hints', async () => {
  const tempDir = await createTempDir();
  try {
    const afterReport = buildReport({ score: 70, protocols: [] });
    const afterPath = await writeReport(tempDir, 'after.json', afterReport);

    const authError = new Error('Bad credentials');
    authError.status = 401;
    const octokit = createAuthFailureOctokit(authError);

    await assert.rejects(
      runPRCommentWorkflow({
        repo: 'acme/dochealth',
        prNumber: 2,
        afterReportPath: afterPath,
        beforeReportPath: null,
        octokit
      }),
      /GitHub authentication failed/i
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('runPRCommentWorkflow highlights rate limit failures when posting comments', async () => {
  const tempDir = await createTempDir();
  try {
    const beforeReport = buildReport({ score: 70, protocols: [] });
    const afterReport = buildReport({ score: 72, protocols: [] });
    const beforePath = await writeReport(tempDir, 'before.json', beforeReport);
    const afterPath = await writeReport(tempDir, 'after.json', afterReport);

    const rateError = new Error('API rate limit exceeded');
    rateError.status = 403;
    const octokit = createRateLimitOctokit(rateError);

    await assert.rejects(
      runPRCommentWorkflow({
        repo: 'acme/dochealth',
        prNumber: 4,
        beforeReportPath: beforePath,
        afterReportPath: afterPath,
        identifier: COMMENT_IDENTIFIER,
        octokit
      }),
      /rate limit/i
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
