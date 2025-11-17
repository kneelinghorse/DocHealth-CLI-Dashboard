const { App, Octokit } = require('octokit');
const { retry } = require('@octokit/plugin-retry');
const { throttling } = require('@octokit/plugin-throttling');

const InstrumentedOctokit = Octokit.plugin(retry, throttling);

function createThrottleConfig() {
  return {
    id: 'dochealth-pr-comment',
    onRateLimit: (retryAfter, options, octokit, retryCount) => {
      const requestLabel = `${options.method} ${options.url}`;
      console.warn(
        `GitHub API rate limit hit for ${requestLabel}. retry in ${retryAfter}s (retry #${retryCount || 0}).`
      );
      return retryCount < 2;
    },
    onSecondaryRateLimit: (retryAfter, options) => {
      const requestLabel = `${options.method} ${options.url}`;
      console.error(
        `Secondary rate limit detected for ${requestLabel}. Waiting ${retryAfter}s before retrying.`
      );
      return true;
    }
  };
}

function createGitHubAppClient({ appId, privateKey, installationId }) {
  if (!appId) throw new Error('GitHub App ID is required.');
  if (!privateKey) throw new Error('GitHub App private key is required.');
  if (!installationId) throw new Error('GitHub App installation ID is required.');

  const normalizedKey = privateKey.includes('BEGIN')
    ? privateKey
    : Buffer.from(privateKey, 'base64').toString('utf8');

  const app = new App({
    appId,
    privateKey: normalizedKey,
    Octokit: InstrumentedOctokit,
    throttle: createThrottleConfig()
  });

  return app.getInstallationOctokit(installationId);
}

module.exports = {
  createGitHubAppClient
};
