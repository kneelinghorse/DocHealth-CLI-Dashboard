const path = require('path');
const chalk = require('chalk');

const { runPRCommentWorkflow, COMMENT_IDENTIFIER } = require('../../lib/github/pr-comment');

function registerPRCommentCommand(program) {
  program
    .command('pr-comment')
    .description('Post a DocHealth health delta comment to a GitHub pull request')
    .requiredOption('--repo <owner/repo>', 'Repository slug in owner/repo format')
    .requiredOption('--pr <number>', 'Pull request number', value => Number(value))
    .option('--before-report <path>', 'Path to baseline (base branch) health JSON report')
    .requiredOption('--after-report <path>', 'Path to head branch health JSON report')
    .option('--app-id <id>', 'Override GitHub App ID')
    .option('--installation-id <id>', 'Override GitHub App installation ID')
    .option('--private-key-path <path>', 'Path to GitHub App private key PEM file')
    .option('--private-key <pem>', 'Inline GitHub App private key (use with caution)')
    .option('--identifier <marker>', 'Sticky comment identifier', COMMENT_IDENTIFIER)
    .option('--base-sha <sha>', 'Override base commit SHA (enables offline dry run)')
    .option('--base-ref <ref>', 'Optional base ref label for reporting')
    .option('--head-sha <sha>', 'Override head commit SHA (enables offline dry run)')
    .option('--head-ref <ref>', 'Optional head ref label for reporting')
    .option('--pr-url <url>', 'Override pull request URL in dry-run output')
    .option('--dry-run', 'Skip posting to GitHub and print the comment body')
    .action(async options => {
      const globalOpts = program.opts();
      const resolvedBefore = options.beforeReport
        ? path.resolve(options.beforeReport)
        : null;
      const resolvedAfter = path.resolve(options.afterReport);

      try {
        console.log(chalk.blue('💬 Preparing DocHealth pull request comment...'));
        console.log(chalk.gray(`Repository: ${options.repo}`));
        console.log(chalk.gray(`PR #: ${options.pr}`));
        if (resolvedBefore) {
          console.log(chalk.gray(`Baseline report: ${resolvedBefore}`));
        }
        console.log(chalk.gray(`Head report: ${resolvedAfter}`));

        const result = await runPRCommentWorkflow({
          repo: options.repo,
          prNumber: options.pr,
          beforeReportPath: resolvedBefore,
          afterReportPath: resolvedAfter,
          appId: options.appId,
          installationId: options.installationId,
          privateKeyPath: options.privateKeyPath,
          privateKey: options.privateKey,
          dryRun: Boolean(options.dryRun),
          identifier: options.identifier,
          baseSha: options.baseSha,
          baseRef: options.baseRef,
          headSha: options.headSha,
          headRef: options.headRef,
          pullRequestUrl: options.prUrl
        });

        if (options.dryRun) {
          console.log(chalk.yellow('\nDry run output (comment not posted):\n'));
          console.log(result.commentBody);
        } else {
          console.log(
            chalk.green(
              `✅ ${result.comment.action === 'created' ? 'Posted' : 'Updated'} DocHealth comment: ${result.comment.url}`
            )
          );
        }

        if (globalOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        }

        process.exit(0);
      } catch (error) {
        console.error(chalk.red('❌ Failed to post DocHealth PR comment'));
        console.error(error.message);
        if (globalOpts.verbose) {
          console.error(error.stack);
        }
        process.exit(2);
      }
    });
}

module.exports = {
  registerPRCommentCommand
};
