const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const { mergeDocuments } = require('../../lib/merge/ast-merger');
const {
  loadConflictRecord,
  saveConflictRecord,
  clearConflictRecord,
  CONFLICT_TYPES
} = require('../../lib/merge/conflict-detector');
const { writeBase } = require('../../lib/merge/base-storage');

async function readLocalFile(targetPath) {
  try {
    return await fs.readFile(targetPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Local file not found: ${targetPath}`);
    }
    throw error;
  }
}

function formatSnippet(value = '') {
  const lines = value.split('\n').filter(Boolean);
  return lines.slice(0, 6).join('\n');
}

async function promptManualContent(rl) {
  console.log(
    chalk.gray(
      'Enter custom Markdown for this section. Submit a single "." on its own line to finish.'
    )
  );
  const lines = [];
  while (true) {
    const answer = await rl.question('manual> ');
    if (answer.trim() === '.') break;
    lines.push(answer);
  }
  const text = lines.join('\n').trim();
  if (!text) {
    console.log(chalk.red('Manual content cannot be empty.'));
    return promptManualContent(rl);
  }
  return text;
}

async function promptResolution(rl, conflict) {
  console.log('');
  console.log(chalk.cyan(`[${conflict.id}] ${conflict.type}`));
  console.log(chalk.gray(conflict.message));

  if (conflict.localText) {
    console.log(chalk.yellow('\nYour version preview:'));
    console.log(chalk.gray(formatSnippet(conflict.localText) || '(empty)'));
  }
  if (conflict.remoteText) {
    console.log(chalk.green('\nGenerator preview:'));
    console.log(chalk.gray(formatSnippet(conflict.remoteText) || '(empty)'));
  }

  let options;
  if (conflict.type === CONFLICT_TYPES.ORPHANED_CONTENT) {
    options = [
      { key: '1', label: 'Delete section (accept generator removal)', strategy: 'remote' },
      { key: '2', label: 'Keep as human-only content', strategy: 'local' },
      { key: '3', label: 'Manual edit', strategy: 'manual' }
    ];
  } else if (conflict.type === CONFLICT_TYPES.USER_DELETED) {
    options = [
      { key: '1', label: 'Restore generator section', strategy: 'remote' },
      { key: '2', label: 'Keep section deleted', strategy: 'local' },
      { key: '3', label: 'Manual edit', strategy: 'manual' }
    ];
  } else {
    options = [
      { key: '1', label: 'Keep generator output', strategy: 'remote' },
      { key: '2', label: 'Keep your version', strategy: 'local' },
      { key: '3', label: 'Manual edit', strategy: 'manual' }
    ];
  }

  options.forEach(option => {
    console.log(`${option.key}. ${option.label}`);
  });

  while (true) {
    const answer = (await rl.question('Select option (1-3): ')).trim();
    const choice = options.find(option => option.key === answer);
    if (choice) {
      if (choice.strategy === 'manual') {
        const manualContent = await promptManualContent(rl);
        return { strategy: 'manual', manualContent };
      }
      return { strategy: choice.strategy };
    }
    console.log(chalk.red('Invalid selection. Please choose 1, 2, or 3.'));
  }
}

function registerResolveCommand(program) {
  program
    .command('resolve')
    .description('Walk through conflicts produced by dochealth merge-docs')
    .requiredOption('--file <path>', 'Path to the Markdown document with pending conflicts')
    .option('--root <path>', 'Project root used to resolve .dochealth state', process.cwd())
    .action(async options => {
      const projectRoot = path.resolve(options.root || process.cwd());
      const targetPath = path.resolve(projectRoot, options.file);
      const relativePath = path.relative(projectRoot, targetPath);

      try {
        const record = await loadConflictRecord(targetPath, { root: projectRoot });
        if (!record || !Array.isArray(record.conflicts) || record.conflicts.length === 0) {
          console.log(chalk.green(`No recorded conflicts for ${relativePath}.`));
          return;
        }

        const rl = readline.createInterface({ input, output });
        const resolutionMap = new Map();

        try {
          for (const conflict of record.conflicts) {
            const resolution = await promptResolution(rl, conflict);
            resolutionMap.set(conflict.id, resolution);
          }
        } finally {
          rl.close();
        }

        const localContent = await readLocalFile(targetPath);
        const mergeResult = await mergeDocuments({
          baseContent: record.baseContent,
          localContent,
          remoteContent: record.remoteContent,
          filePath: targetPath,
          resolutionMap
        });

        await fs.writeFile(targetPath, mergeResult.mergedContent, 'utf8');

        if (mergeResult.conflicts.length > 0) {
          console.log(
            chalk.yellow(
              `⚠️  Some conflicts remain (${mergeResult.conflicts.length}). Please resolve them again.`
            )
          );
          await saveConflictRecord(
            targetPath,
            {
              ...record,
              conflicts: mergeResult.conflicts
            },
            { root: projectRoot }
          );
          process.exitCode = 1;
          return;
        }

        await writeBase(targetPath, record.remoteContent, { root: projectRoot });
        await clearConflictRecord(targetPath, { root: projectRoot });

        console.log(chalk.green(`✅ Conflicts resolved for ${relativePath}`));
      } catch (error) {
        console.error(chalk.red(`❌ Resolve failed: ${error.message}`));
        process.exitCode = 1;
      }
    });
}

module.exports = {
  registerResolveCommand
};
