const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { mergeDocuments } = require('../../lib/merge/ast-merger');
const { readBase, writeBase } = require('../../lib/merge/base-storage');
const {
  saveConflictRecord,
  clearConflictRecord
} = require('../../lib/merge/conflict-detector');

async function ensureLocalFile(targetPath) {
  try {
    return await fs.readFile(targetPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Local file not found: ${targetPath}`);
    }
    throw error;
  }
}

async function readRemoteFile(targetPath) {
  try {
    return await fs.readFile(targetPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Remote file not found: ${targetPath}`);
    }
    throw error;
  }
}

function registerMergeDocsCommand(program) {
  program
    .command('merge-docs')
    .description('Merge regenerated documentation with local edits using semantic AST logic')
    .requiredOption('--local <path>', 'Path to the local Markdown file to update')
    .requiredOption('--remote <path>', 'Path to the freshly generated Markdown file')
    .option('--base <path>', 'Override BASE snapshot path (defaults to .dochealth/base/<local>)')
    .option('--root <path>', 'Project root used to resolve .dochealth state (defaults to cwd)')
    .option('--auto-accept-theirs', 'Automatically accept generator output for conflicts', false)
    .action(async (options) => {
      const projectRoot = path.resolve(options.root || process.cwd());
      const localPath = path.resolve(projectRoot, options.local);
      const remotePath = path.resolve(projectRoot, options.remote);
      const relativePath = path.relative(projectRoot, localPath);
      const autoAccept = Boolean(options.autoAcceptTheirs);

      try {
        const localContent = await ensureLocalFile(localPath);
        const remoteContent = await readRemoteFile(remotePath);

        let baseContent = null;
        let baseFromSnapshot = false;
        if (options.base) {
          baseContent = await ensureLocalFile(path.resolve(projectRoot, options.base));
          baseFromSnapshot = true;
        } else {
          const snapshot = await readBase(localPath, { root: projectRoot });
          if (snapshot) {
            baseContent = snapshot;
            baseFromSnapshot = true;
          }
        }

        if (!baseContent) {
          console.log(
            chalk.yellow(
              `⚠️  No BASE snapshot found for ${relativePath}. Using local file as baseline.`
            )
          );
          baseContent = localContent;
        }

        const humanReferenceContent = baseFromSnapshot ? baseContent : remoteContent;

        const mergeResult = await mergeDocuments({
          baseContent,
          localContent,
          remoteContent,
          humanReferenceContent,
          filePath: localPath,
          autoAcceptTheirs: autoAccept
        });

        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await fs.writeFile(localPath, mergeResult.mergedContent, 'utf8');

        if (mergeResult.conflicts.length > 0) {
          console.log(
            chalk.yellow(
              `⚠️  Merge completed with ${mergeResult.conflicts.length} conflict(s).`
            )
          );

          const conflictRecord = {
            file: relativePath,
            createdAt: new Date().toISOString(),
            baseContent,
            remoteContent,
            conflicts: mergeResult.conflicts
          };

          await saveConflictRecord(localPath, conflictRecord, { root: projectRoot });
          console.log(
            chalk.white(
              `Run ${chalk.cyan('dochealth resolve --file ' + relativePath)} to finish resolving.`
            )
          );
          process.exitCode = 1;
          return;
        }

        await writeBase(localPath, remoteContent, { root: projectRoot });
        await clearConflictRecord(localPath, { root: projectRoot });

        console.log(chalk.green(`✅ Merge completed for ${relativePath}`));
      } catch (error) {
        console.error(chalk.red(`❌ Merge failed: ${error.message}`));
        process.exitCode = 1;
      }
    });
}

module.exports = {
  registerMergeDocsCommand
};
