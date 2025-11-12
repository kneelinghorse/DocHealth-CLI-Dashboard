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
const { registerMergeDocsCommand } = require('./commands/merge-docs');
const { registerResolveCommand } = require('./commands/resolve');
const { registerGenerateCommand } = require('./commands/generate');

const program = new Command();

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

registerGenerateCommand(program);

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
