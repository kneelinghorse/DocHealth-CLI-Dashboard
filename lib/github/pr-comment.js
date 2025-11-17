const fs = require('node:fs/promises');
const path = require('node:path');

const { createGitHubAppClient } = require('./app-client');
const { calculateHealthDelta } = require('./health-delta');
const { COMMENT_IDENTIFIER, formatPRComment } = require('./comment-formatter');

async function loadReportFromFile(filePath) {
  if (!filePath) {
    return null;
  }

  const resolved = path.resolve(filePath);
  let content;
  try {
    content = await fs.readFile(resolved, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Health report not found at ${resolved}`);
    }
    throw error;
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse JSON report at ${resolved}: ${error.message}`);
  }
}

function parseRepoSlug(repo) {
  const [owner, name] = (repo || '').split('/');
  if (!owner || !name) {
    throw new Error('Repository must be in owner/repo format.');
  }
  return { owner, name };
}

async function resolvePrivateKey(options) {
  if (options.privateKey) {
    return options.privateKey.replace(/\\n/g, '\n');
  }

  if (options.privateKeyPath) {
    const resolvedPath = path.resolve(options.privateKeyPath);
    return fs.readFile(resolvedPath, 'utf8');
  }

  return null;
}

async function resolveOctokit(options) {
  if (options.octokit) {
    return options.octokit;
  }

  const appId = options.appId || process.env.DOCHEALTH_GITHUB_APP_ID || process.env.GITHUB_APP_ID;
  const installationId = options.installationId || process.env.DOCHEALTH_GITHUB_INSTALLATION_ID || process.env.GITHUB_INSTALLATION_ID;
  const privateKey = await resolvePrivateKey({
    privateKey:
      options.privateKey ||
      process.env.DOCHEALTH_GITHUB_PRIVATE_KEY ||
      process.env.GITHUB_APP_PRIVATE_KEY,
    privateKeyPath:
      options.privateKeyPath ||
      process.env.DOCHEALTH_GITHUB_PRIVATE_KEY_PATH ||
      process.env.GITHUB_APP_PRIVATE_KEY_PATH
  });

  if (!appId || !installationId || !privateKey) {
    throw new Error('GitHub App credentials are required. Set DOCHEALTH_GITHUB_APP_ID, DOCHEALTH_GITHUB_INSTALLATION_ID, and DOCHEALTH_GITHUB_PRIVATE_KEY.');
  }

  return createGitHubAppClient({ appId, installationId, privateKey });
}

async function fetchPullRequest(octokit, { owner, repo, pullNumber }) {
  const response = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });
  return response.data;
}

async function upsertStickyComment(octokit, { owner, repo, issueNumber, body, identifier }) {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100
  });

  const existing = comments.find(comment => comment.body && comment.body.includes(identifier));

  if (existing) {
    const response = await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body
    });
    return { action: 'updated', url: response.data.html_url, id: response.data.id };
  }

  const response = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body
  });
  return { action: 'created', url: response.data.html_url, id: response.data.id };
}

async function runPRCommentWorkflow(options) {
  const { repo, prNumber, beforeReportPath, afterReportPath, dryRun = false, identifier = COMMENT_IDENTIFIER } = options;

  if (!repo) throw new Error('Repository (--repo) is required.');
  if (!prNumber) throw new Error('Pull request number (--pr) is required.');
  if (!afterReportPath) throw new Error('Path to the after/head health report is required.');

  const { owner, name } = parseRepoSlug(repo);
  const [beforeReport, afterReport] = await Promise.all([
    loadReportFromFile(beforeReportPath),
    loadReportFromFile(afterReportPath)
  ]);

  if (!afterReport) {
    throw new Error('Failed to load after/head health report.');
  }

  const octokit = await resolveOctokit(options);
  const pullRequest = await fetchPullRequest(octokit, { owner, repo: name, pullNumber: Number(prNumber) });

  const delta = calculateHealthDelta(beforeReport || {}, afterReport || {}, {
    baseSha: pullRequest.base.sha,
    headSha: pullRequest.head.sha
  });

  const commentBody = formatPRComment(delta, {
    repo: `${owner}/${name}`,
    prNumber,
    baseSha: pullRequest.base.sha,
    headSha: pullRequest.head.sha,
    identifier
  });

  if (dryRun) {
    return {
      dryRun: true,
      delta,
      commentBody,
      pullRequest: { number: prNumber, url: pullRequest.html_url },
      reports: { before: beforeReportPath || null, after: afterReportPath }
    };
  }

  const comment = await upsertStickyComment(octokit, {
    owner,
    repo: name,
    issueNumber: Number(prNumber),
    body: commentBody,
    identifier
  });

  return {
    delta,
    comment,
    pullRequest: { number: prNumber, url: pullRequest.html_url },
    reports: { before: beforeReportPath || null, after: afterReportPath }
  };
}

module.exports = {
  COMMENT_IDENTIFIER,
  formatPRComment,
  loadReportFromFile,
  runPRCommentWorkflow
};
