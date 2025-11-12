const path = require('path');
const chalk = require('chalk');
const { runGeneratorPipeline } = require('../../lib/generator-pipeline');

const SUPPORTED_TYPES = ['api', 'data', 'workflow'];

function resolveTargetTypes(typeArg) {
  const normalized = String(typeArg || '').toLowerCase();
  if (!normalized || normalized === 'all') {
    return SUPPORTED_TYPES;
  }
  if (normalized === 'workflow' || normalized === 'workflows') {
    return ['workflow'];
  }
  if (SUPPORTED_TYPES.includes(normalized)) {
    return [normalized];
  }
  return [];
}

function logLoadErrors(loadResults) {
  if (!loadResults?.errors?.length) return;
  console.error(
    chalk.yellow(`⚠️  ${loadResults.errors.length} protocol(s) failed to load during generation`)
  );
  loadResults.errors.slice(0, 3).forEach(err => {
    console.error(
      chalk.gray(`  - ${err.path || 'unknown'}: ${err.message || 'Unknown error'}`)
    );
  });
}

function logSummary(summary, mergeEnabled) {
  if (!summary || summary.documentsPlanned === 0) {
    console.log(
      chalk.yellow(`⚠️  No ${summary?.label?.toLowerCase() || 'requested'} protocols found.`)
    );
    return;
  }

  console.log(
    chalk.green(
      `\n✅ Generated ${summary.documentsWritten} ${summary.label} document(s) across ${summary.protocolsProcessed} protocol(s).`
    )
  );

  summary.protocolSummaries.forEach(item => {
    const benchmark = item.performance
      ? `${item.performance.durationMs}ms / ${item.performance.sampleSize}`
      : 'n/a';
    console.log(
      chalk.gray(
        `  • ${item.name}: ${item.files} file(s) → ${item.outputDir} (benchmark: ${benchmark})`
      )
    );
  });

  if (mergeEnabled && summary.conflicts > 0) {
    console.log(
      chalk.yellow(
        `⚠️  ${summary.conflicts} merge conflict(s) detected. Resolve via ${chalk.cyan(
          'dochealth resolve --file <path>'
        )}.`
      )
    );
  }
}

function parseConcurrency(value) {
  if (value == null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function registerGenerateCommand(program) {
  program
    .command('generate')
    .description('Generate documentation from protocols')
    .argument('<type>', 'Documentation type (api, data, workflows, all)')
    .option('-p, --path <path>', 'Path to protocol manifests', './src')
    .option('-o, --output <path>', 'Output directory', './docs')
    .option('--format <format>', 'Output format (markdown, docusaurus, mkdocs)', 'markdown')
    .option('--merge', 'Preserve human edits by merging with existing docs', true)
    .option('--concurrency <number>', 'Concurrent file writes (default 200)')
    .option('--root <path>', 'Project root used for .dochealth state', process.cwd())
    .option('--state-dir <path>', 'Override .dochealth state directory')
    .action(async (typeArg, options) => {
      const globalOpts = program.opts();
      const normalizedType = String(typeArg || '').toLowerCase();
      const targetTypes = resolveTargetTypes(typeArg);

      if (!targetTypes.length) {
        console.log(
          chalk.yellow('⚠️  Supported generator types: api, data, workflow, workflows, all.')
        );
        if (globalOpts.json) {
          console.log(
            JSON.stringify(
              {
                type: normalizedType,
                status: 'invalid',
                supportedTypes: SUPPORTED_TYPES
              },
              null,
              2
            )
          );
        }
        process.exit(0);
        return;
      }

      const resolvedOutput = path.resolve(options.output);
      const resolvedProtocols = path.resolve(options.path);
      const mergeEnabled = options.merge !== false;

      console.log(
        chalk.blue(
          `📄 Generating ${normalizedType === 'all' ? 'all targets' : normalizedType} documentation...`
        )
      );
      console.log(chalk.gray(`Manifest path: ${resolvedProtocols}`));
      console.log(chalk.gray(`Output: ${resolvedOutput}`));
      console.log(chalk.gray(`Format: ${options.format}`));
      console.log(
        chalk.gray(`Merge mode: ${mergeEnabled ? 'enabled (auto-merge existing docs)' : 'disabled'}`)
      );

      try {
        const pipelineResult = await runGeneratorPipeline({
          types: targetTypes,
          protocolsPath: resolvedProtocols,
          outputDir: resolvedOutput,
          format: options.format,
          merge: mergeEnabled,
          concurrency: parseConcurrency(options.concurrency),
          mergeRoot: options.root ? path.resolve(options.root) : process.cwd(),
          stateDir: options.stateDir ? path.resolve(options.stateDir) : null
        });

        logLoadErrors(pipelineResult.loadResults);
        targetTypes.forEach(type => logSummary(pipelineResult.summaries[type], mergeEnabled));

        if (globalOpts.json) {
          console.log(
            JSON.stringify(
              {
                type: normalizedType,
                types: targetTypes,
                format: options.format,
                output: resolvedOutput,
                merge: mergeEnabled,
                summaries: pipelineResult.summaries,
                loadStats: pipelineResult.loadResults.stats,
                loadErrors: pipelineResult.loadResults.errors
              },
              null,
              2
            )
          );
        }

        if (normalizedType !== 'all') {
          const targetSummary = pipelineResult.summaries[targetTypes[0]];
          if (!targetSummary || targetSummary.documentsWritten === 0) {
            console.error(
              chalk.red(`❌ No ${targetSummary?.label || normalizedType} documents were generated.`)
            );
            process.exit(2);
            return;
          }
        }

        process.exit(0);
      } catch (error) {
        console.error(chalk.red('Error generating documentation:'), error.message);
        if (globalOpts.verbose) {
          console.error(error.stack);
        }
        process.exit(2);
      }
    });
}

module.exports = {
  registerGenerateCommand
};
