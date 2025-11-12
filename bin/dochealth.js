#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs').promises;

// Import core modules
const { loadProtocols } = require('../lib/loader');
const { analyzeMultipleProtocols } = require('../lib/analyzer');
const {
  calculateHealthScore,
  generateCLIReport,
  generateJSONReport,
  getExitCode
} = require('../lib/reporter');
const {
  createProtocolRegistry,
  validateURNs,
  generateRemediation,
  extractURNsFromManifest
} = require('../lib/urn-resolver');
const { generateAPIReferences } = require('../lib/generators/api-generator');
const { generateDataCatalogDocs } = require('../lib/generators/data-generator');
const { generateWorkflowDocs } = require('../lib/generators/workflow-generator');
const { createSlug } = require('../lib/generators/helpers');
const { registerMergeDocsCommand } = require('./commands/merge-docs');
const { registerResolveCommand } = require('./commands/resolve');

const program = new Command();
const SUPPORTED_GENERATORS = ['api', 'data', 'workflow'];

// Global options
program
  .name('dochealth')
  .description('DocHealth CLI - Protocol-driven documentation health monitoring')
  .version('0.1.0')
  .option('--json', 'Output results as JSON')
  .option('--threshold <number>', 'Health score threshold (0-100)', '70')
  .option('--config <path>', 'Path to config file', 'dochealth.config.js')
  .option('--no-color', 'Disable colored output');

// Check command - full implementation
program
  .command('check')
  .description('Check documentation health across protocols')
  .option('-p, --path <path>', 'Path to protocol manifests', './src')
  .option('--strict', 'Fail on any issues (exit code 1)')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Running documentation health check...\n'));
      
      // Load protocols from specified path
      const loadResults = await loadProtocols(options.path);
      
      if (loadResults.errors.length > 0) {
        console.error(chalk.yellow(`⚠️  Warning: ${loadResults.errors.length} protocol(s) failed to load`));
        if (program.opts().verbose) {
          loadResults.errors.forEach(err => {
            console.error(chalk.gray(`  - ${err.path}: ${err.message}`));
          });
        }
      }

      if (loadResults.protocols.length === 0) {
        console.error(chalk.red('❌ No protocols found or loaded successfully'));
        process.exit(2);
      }

      // Extract manifests from loaded protocols
      const manifests = loadResults.protocols.map(p => p.protocol.manifest());
      
      // Create protocol registry for URN validation
      const protocolInstances = loadResults.protocols.map(p => p.protocol);
      const registry = createProtocolRegistry(protocolInstances);
      
      // Extract and validate URNs across all protocols
      const allURNs = [];
      loadResults.protocols.forEach(p => {
        const protocolType = p.type;
        const urns = extractURNsFromManifest(p.protocol.manifest(), protocolType);
        allURNs.push(...urns);
      });
      
      const urnValidation = validateURNs(allURNs, registry);
      
      // Analyze all protocols
      const analysisResults = analyzeMultipleProtocols(manifests);
      
      // Add URN validation results to analysis
      analysisResults.urnValidation = urnValidation;
      
      // Calculate health score
      const healthScore = calculateHealthScore(analysisResults);
      
      // Generate report based on output format
      const globalOpts = program.opts();
      const reportOpts = {
        showDetails: true,
        color: globalOpts.color !== false
      };

      if (globalOpts.json) {
        const jsonReport = generateJSONReport(healthScore, analysisResults, {
          includeDetails: true
        });
        console.log(JSON.stringify(jsonReport, null, 2));
      } else {
        const cliReport = generateCLIReport(healthScore, analysisResults, reportOpts);
        console.log(cliReport);
      }

      // Exit code handling
      const exitCode = getExitCode(healthScore, {
        threshold: parseInt(globalOpts.threshold),
        strict: options.strict
      });
      
      if (exitCode === 0) {
        console.log(chalk.green('\n✅ Health check passed'));
      } else {
        console.error(chalk.red(`\n❌ Health check failed (exit code: ${exitCode})`));
      }
      
      process.exit(exitCode);

    } catch (error) {
      console.error(chalk.red('Error running health check:'), error.message);
      if (program.opts().verbose) {
        console.error(error.stack);
      }
      process.exit(2);
    }
  });

// Generate command - stub
program
  .command('generate')
  .description('Generate documentation from protocols')
  .argument('<type>', 'Documentation type (api, data, workflow, all)')
  .option('-p, --path <path>', 'Path to protocol manifests', './src')
  .option('-o, --output <path>', 'Output directory', './docs')
  .option('--format <format>', 'Output format (markdown, docusaurus, mkdocs)', 'markdown')
  .action(async (type, options) => {
    try {
      const normalizedType = (type || '').toLowerCase();
      const targetTypes = normalizedType === 'all'
        ? SUPPORTED_GENERATORS
        : [normalizedType];
      const resolvedOutput = path.resolve(options.output);
      const globalOpts = program.opts();
      
      console.log(chalk.blue(`📄 Generating ${normalizedType || 'unknown'} documentation...`));
      console.log(chalk.gray(`Output: ${resolvedOutput}`));
      console.log(chalk.gray(`Format: ${options.format}`));
      
      await fs.mkdir(resolvedOutput, { recursive: true });
      const loadResults = await loadProtocols(options.path);
      
      if (loadResults.errors.length > 0) {
        console.error(chalk.yellow(`⚠️  ${loadResults.errors.length} protocol(s) failed to load during generation`));
        loadResults.errors.slice(0, 3).forEach(err => {
          console.error(chalk.gray(`  - ${err.path || 'unknown'}: ${err.message}`));
        });
      }

      if (normalizedType !== 'all' && !SUPPORTED_GENERATORS.includes(normalizedType)) {
        console.log(chalk.yellow('\n⚠️  Supported generator types: api, data, workflow.'));
        if (globalOpts.json) {
          console.log(JSON.stringify({
            type: normalizedType,
            status: 'stub',
            supportedTypes: SUPPORTED_GENERATORS,
            message: 'Supported generators: api, data, workflow'
          }, null, 2));
        }
        process.exit(0);
        return;
      }

      const apiSummaries = [];
      const dataSummaries = [];
      const apiProtocols = loadResults.protocols.filter(p => p.type === 'api');
      const dataProtocols = loadResults.protocols.filter(p => p.type === 'data');
      const workflowProtocols = loadResults.protocols.filter(p => p.type === 'workflow');

      if (targetTypes.includes('api')) {
        if (apiProtocols.length === 0) {
          console.error(chalk.red('❌ No API protocols available for generation'));
          if (normalizedType !== 'all') {
            process.exit(2);
            return;
          }
        } else {
          for (const entry of apiProtocols) {
            const manifest = entry.protocol.manifest();
            const generation = await generateAPIReferences(manifest, { format: options.format });
            const serviceDir = path.join(resolvedOutput, createSlug(generation.serviceSlug || generation.service));
            await fs.mkdir(serviceDir, { recursive: true });
            
            for (const doc of generation.endpoints) {
              const targetPath = path.join(serviceDir, doc.fileName);
              await fs.writeFile(targetPath, doc.content, 'utf8');
            }
            
            apiSummaries.push({
              service: generation.service,
              files: generation.endpoints.length,
              outputDir: serviceDir,
              performance: generation.performance
            });
          }
          
          console.log(chalk.green(`\n✅ Generated API reference docs for ${apiSummaries.length} protocol(s).`));
          apiSummaries.forEach(summary => {
            console.log(
              chalk.gray(
                `  • ${summary.service}: ${summary.files} file(s) → ${summary.outputDir} (benchmark: ${summary.performance.durationMs}ms / ${summary.performance.sampleSize})`
              )
            );
          });
        }
      }

      if (targetTypes.includes('data')) {
        if (dataProtocols.length === 0) {
          console.error(chalk.red('❌ No data protocols available for generation'));
          if (normalizedType !== 'all') {
            process.exit(2);
            return;
          }
        } else {
          const datasetDir = path.join(resolvedOutput, 'data');
          await fs.mkdir(datasetDir, { recursive: true });

          for (const entry of dataProtocols) {
            const manifest = entry.protocol.manifest();
            const generation = await generateDataCatalogDocs(manifest, { format: options.format });
            const doc = generation.document;
            const targetPath = path.join(datasetDir, doc.fileName);
            await fs.writeFile(targetPath, doc.content, 'utf8');
            dataSummaries.push({
              dataset: generation.dataset,
              file: doc.fileName,
              outputDir: datasetDir,
              performance: generation.performance
            });
          }

          console.log(chalk.green(`\n✅ Generated data catalog docs for ${dataSummaries.length} dataset(s).`));
          dataSummaries.forEach(summary => {
            console.log(
              chalk.gray(
                `  • ${summary.dataset}: ${summary.file} → ${summary.outputDir} (benchmark: ${summary.performance.durationMs}ms / ${summary.performance.sampleSize})`
              )
            );
          });
        }
      }

      const workflowSummaries = [];
      if (targetTypes.includes('workflow')) {
        if (workflowProtocols.length === 0) {
          console.error(chalk.red('❌ No workflow protocols available for generation'));
          if (normalizedType !== 'all') {
            process.exit(2);
            return;
          }
        } else {
          const workflowDir = path.join(resolvedOutput, 'workflows');
          await fs.mkdir(workflowDir, { recursive: true });

          for (const entry of workflowProtocols) {
            const manifest = entry.protocol.manifest();
            const generation = await generateWorkflowDocs(manifest, { format: options.format });
            const doc = generation.document;
            const targetPath = path.join(workflowDir, doc.fileName);
            await fs.writeFile(targetPath, doc.content, 'utf8');
            workflowSummaries.push({
              workflow: generation.workflow,
              file: doc.fileName,
              outputDir: workflowDir,
              performance: generation.performance
            });
          }

          console.log(chalk.green(`\n✅ Generated workflow diagrams for ${workflowSummaries.length} protocol(s).`));
          workflowSummaries.forEach(summary => {
            console.log(
              chalk.gray(
                `  • ${summary.workflow}: ${summary.file} → ${summary.outputDir} (benchmark: ${summary.performance.durationMs}ms / ${summary.performance.sampleSize})`
              )
            );
          });
        }
      }
      
      if (globalOpts.json) {
        console.log(JSON.stringify({
          type: normalizedType,
          format: options.format,
          output: resolvedOutput,
          api: apiSummaries,
          data: dataSummaries,
          workflow: workflowSummaries
        }, null, 2));
      }
      
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('Error generating documentation:'), error.message);
      if (program.opts().verbose) {
        console.error(error.stack);
      }
      process.exit(2);
    }
  });

// Diff command - stub
program
  .command('diff')
  .description('Show differences between protocol and documentation')
  .option('-p, --path <path>', 'Path to protocol manifests', './src')
  .option('--docs-path <path>', 'Path to documentation', './docs')
  .action(async (options) => {
    try {
      console.log(chalk.blue('📊 Showing protocol/documentation differences...'));
      console.log(chalk.gray(`Protocol path: ${options.path}`));
      console.log(chalk.gray(`Docs path: ${options.docsPath}`));
      
      // Placeholder - actual diff logic would go here
      console.log(chalk.yellow('\n⚠️  Diff command is a stub - implementation pending'));
      
      if (program.opts().json) {
        console.log(JSON.stringify({
          path: options.path,
          docsPath: options.docsPath,
          status: 'stub',
          message: 'Diff command not yet implemented'
        }, null, 2));
      }
      
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('Error showing diff:'), error.message);
      process.exit(2);
    }
  });

// Init command - stub
program
  .command('init')
  .description('Initialize dochealth configuration')
  .option('-f, --force', 'Overwrite existing config')
  .action(async (options) => {
    try {
      const configPath = program.opts().config;
      
      console.log(chalk.blue('⚙️  Initializing DocHealth configuration...'));
      
      // Check if config already exists
      try {
        await fs.access(configPath);
        if (!options.force) {
          console.error(chalk.red(`Config file already exists at ${configPath}`));
          console.log(chalk.yellow('Use --force to overwrite'));
          process.exit(1);
        }
      } catch {
        // File doesn't exist, which is fine
      }
      
      // Create default config
      const defaultConfig = `module.exports = {
  // Protocol manifest paths
  protocols: {
    api: './src/api_protocol_*.js',
    data: './src/data_protocol_*.js',
    workflow: './src/workflow_protocol_*.js',
    documentation: './src/*documentation*protocol*.js',
    semantic: './src/semantic_protocol_*.js'
  },
  
  // Health check thresholds
  thresholds: {
    healthScore: 70,
    maxStaleDays: 30
  },
  
  // Output settings
  output: {
    format: 'markdown',
    directory: './docs'
  },
  
  // SME routing (future feature)
  sme: {
    autoRoute: false,
    reviewers: []
  }
};`;
      
      await fs.writeFile(configPath, defaultConfig);
      console.log(chalk.green(`✅ Created config file at ${configPath}`));
      
      if (program.opts().json) {
        console.log(JSON.stringify({
          configPath,
          status: 'created',
          message: 'Configuration file created successfully'
        }, null, 2));
      }
      
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('Error initializing config:'), error.message);
      process.exit(2);
    }
  });

registerMergeDocsCommand(program);
registerResolveCommand(program);

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
