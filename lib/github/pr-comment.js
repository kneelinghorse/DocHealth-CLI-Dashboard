const fs = require('node:fs/promises');
const path = require('node:path');

const { createGitHubAppClient } = require('./app-client');
const { calculateHealthDelta } = require('./health-delta');
const { COMMENT_IDENTIFIER, formatPRComment } = require('./comment-formatter');

function formatGitHubError(error, context) {
  const message = context || 'GitHub API request failed';
  if (!error || typeof error !== 'object') {
    return new Error(`${message}.`);
  }

  const original = error.message || 'Unknown GitHub error';
  let hint = '';
  if (error.status === 401) {
    hint = 'GitHub authentication failed. Verify App ID, installation ID, and private key secrets.';
  } else if (error.status === 403 && /rate limit/i.test(original)) {
    hint = 'GitHub API rate limit exceeded. Wait a few minutes before retrying or reduce workflow frequency.';
  } else if (error.status === 404) {
    hint = 'Pull request not found or the GitHub App lacks permission to read it.';
  }

  const suffix = hint ? `${hint} (${original})` : original;
  const wrapped = new Error(`${message}: ${suffix}`);
  wrapped.cause = error;
  return wrapped;
}

function buildDryRunPullRequest({ repo, prNumber, baseSha, headSha, baseRef, headRef, url }) {
  if (!baseSha || !headSha) {
    throw new Error('Dry-run mode requires --base-sha and --head-sha when GitHub metadata is unavailable.');
  }

  return {
    number: Number(prNumber),
    html_url: url || `https://github.com/${repo}/pull/${prNumber}`,
    base: { sha: baseSha, ref: baseRef || 'base' },
    head: { sha: headSha, ref: headRef || 'head' }
  };
}

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
  const {
    repo,
    prNumber,
    beforeReportPath,
    afterReportPath,
    dryRun = false,
    identifier = COMMENT_IDENTIFIER,
    baseSha,
    baseRef,
    headSha,
    headRef,
    pullRequestUrl
  } = options;

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

  let octokit = options.octokit || null;
  const needsRemoteMetadata = !options.pullRequest && !(dryRun && baseSha && headSha);

  if (needsRemoteMetadata && !octokit) {
    try {
      octokit = await resolveOctokit(options);
    } catch (error) {
      throw formatGitHubError(error, 'Unable to authenticate with GitHub');
    }
  }

  let pullRequest;
  if (options.pullRequest) {
    pullRequest = options.pullRequest;
  } else if (needsRemoteMetadata) {
    try {
      pullRequest = await fetchPullRequest(octokit, { owner, repo: name, pullNumber: Number(prNumber) });
    } catch (error) {
      throw formatGitHubError(error, 'Unable to load pull request metadata');
    }
  } else {
    pullRequest = buildDryRunPullRequest({
      repo: `${owner}/${name}`,
      prNumber,
      baseSha,
      baseRef,
      headSha,
      headRef,
      url: pullRequestUrl
    });
  }

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

  const pullRequestDetails = {
    number: Number(prNumber),
    url: pullRequest.html_url || pullRequestUrl || `https://github.com/${owner}/${name}/pull/${prNumber}`,
    base: { ref: pullRequest.base?.ref, sha: pullRequest.base?.sha },
    head: { ref: pullRequest.head?.ref, sha: pullRequest.head?.sha }
  };

  if (dryRun) {
    return {
      dryRun: true,
      delta,
      commentBody,
      pullRequest: pullRequestDetails,
      reports: { before: beforeReportPath || null, after: afterReportPath }
    };
  }

  if (!octokit) {
    try {
      octokit = await resolveOctokit(options);
    } catch (error) {
      throw formatGitHubError(error, 'Unable to authenticate with GitHub');
    }
  }

  let comment;
  try {
    comment = await upsertStickyComment(octokit, {
      owner,
      repo: name,
      issueNumber: Number(prNumber),
      body: commentBody,
      identifier
    });
  } catch (error) {
    throw formatGitHubError(error, 'Unable to post DocHealth pull request comment');
  }

  return {
    delta,
    comment,
    pullRequest: pullRequestDetails,
    reports: { before: beforeReportPath || null, after: afterReportPath }
  };
}

module.exports = {
  COMMENT_IDENTIFIER,
  formatPRComment,
  loadReportFromFile,
  runPRCommentWorkflow
};
