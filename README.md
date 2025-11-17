# DocHealth CLI & Dashboard

**A protocol-driven documentation orchestration tool for developers**

[![Status](https://img.shields.io/badge/status-MVP-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## Overview

DocHealth is a developer-first documentation health monitoring and auto-generation tool that uses protocol manifests as the single source of truth. It solves critical pain points in modern technical documentation workflows:

- 📊 **Freshness Monitoring** - Automatically detect when code changes but documentation doesn't
- 🔍 **Coverage Analysis** - Identify API endpoints, data fields, and workflows without documentation
- 🤖 **Auto-Generation** - Generate documentation skeletons from protocol manifests
- ✅ **CI/CD Integration** - Built-in health checks with exit codes for automated pipelines
- 🎯 **Smart Prioritization** - Semantic criticality scoring for intelligent SME routing
- 📈 **Web Dashboard** - Visualize health trends, browse stale docs, and track coverage gaps

**Built on existing protocol infrastructure** - API, Data, Workflow, Documentation, and Semantic protocols.

---

## Quick Start

```bash
# Install dependencies
npm install

# Launch dashboard (API + Vite dev server)
node bin/dochealth.js serve --port 3000

# Run a health check across ./src protocols
node bin/dochealth.js check --path ./src

# Generate API docs (preserves edits via AST merge)
node bin/dochealth.js generate api --path ./src --output ./docs/generated --merge

# First run and want a clean overwrite?
node bin/dochealth.js generate api --path ./src --output ./docs/generated --no-merge

# Emit structured output for CI pipelines
node bin/dochealth.js check --json > health-report.json
```

---

## Features

### Health Monitoring

**Freshness Detection**
- Compares code change timestamps with documentation updates
- Configurable staleness thresholds (default: 7 days)
- Identifies orphaned documentation without code references
- Prioritizes by semantic criticality scores

**Coverage Analysis**
- Cross-references API endpoints with documentation sections
- Identifies undocumented data fields and workflow steps
- Validates cross-protocol URN links
- Calculates coverage percentage by protocol type

**Health Scoring**
- Aggregate 0-100 health score combining freshness, coverage, and validation
- Weighted algorithm: 40% freshness + 40% coverage + 20% validation
- Prioritized action items with severity levels
- Color-coded CLI output for quick scanning

### Documentation Generation

**Auto-Generation from Protocols**
- API reference Markdown from API Protocol
- Data catalog from Data Protocol schemas
- Workflow diagrams (Mermaid) from Workflow Protocol DAGs
- Skeleton outlines from Documentation Protocol navigation

**Smart Content Merging**
- Preserves existing human-written content
- AST-based 3-way merge strategy
- Handles renames, reorders, and content updates
- Conflict detection and resolution tools

**Multiple Output Formats**
- Standard Markdown (compatible with Docusaurus, MkDocs)
- OpenAPI export from API Protocol
- Mermaid diagrams for workflows
- JSON reports for CI/CD integration

### Web Dashboard

**Health Visualization**
- Real-time health score display with trend charts
- Historical tracking over time
- Score breakdown by freshness, coverage, and validation
- Status indicators (healthy/warning/critical)

**Stale Documentation Browser**
- List of stale protocols with severity indicators
- Drill-down details: timestamps, days stale, recommendations
- Filtering and sorting capabilities
- Actionable fix recommendations

**Coverage Gap Analysis**
- Browse undocumented API endpoints, data fields, and workflow steps
- Protocol filtering (API, Data, Workflow, Docs)
- Search and sort functionality
- Detailed gap information with estimated effort

### CI/CD Integration

**Automated Health Checks**
- Exit codes for build pipelines (0 = healthy, 1 = issues, 2 = error)
- JSON output for programmatic consumption
- Configurable health score thresholds
- Structured reports for automation tools

**GitHub Pull Request Integration**
- Post health delta comments on PRs
- Before/after comparison of health scores
- Actionable feedback with prioritized recommendations
- Sticky comment pattern (updates existing comment)

---

## Installation

### Prerequisites

- Node.js 18+ (for CLI and dashboard)
- Git (for freshness detection via commit history)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd "DocHealth CLI & Dashboard"

# Install dependencies
npm install

# Install dashboard dependencies
cd dashboard
npm install
cd ..

# Verify installation
node bin/dochealth.js --version
```

---

## Usage

### CLI Commands

#### Health Check

```bash
# Basic health check
node bin/dochealth.js check --path ./src

# With custom threshold
node bin/dochealth.js check --path ./src --threshold 80

# JSON output for CI/CD
node bin/dochealth.js check --path ./src --json > report.json

# Custom protocol directory
node bin/dochealth.js check --path ./protocols --config ./custom.config.js
```

#### Documentation Generation

```bash
# Generate API reference
node bin/dochealth.js generate api --path ./src --output ./docs/api

# Generate data catalog
node bin/dochealth.js generate data --path ./src --output ./docs/data

# Generate workflow diagrams
node bin/dochealth.js generate workflows --path ./src --output ./docs/workflows

# Generate all documentation types
node bin/dochealth.js generate all --path ./src --output ./docs/generated

# Disable merge (overwrite existing files)
node bin/dochealth.js generate api --path ./src --output ./docs/api --no-merge
```

#### Dashboard

```bash
# Launch dashboard (development mode)
node bin/dochealth.js serve --port 3000

# Production mode (serve built assets)
NODE_ENV=production node bin/dochealth.js serve --port 8080

# Custom configuration
node bin/dochealth.js serve \
  --dashboard-root ./dashboard \
  --db ./dashboard/server/data/dochealth.sqlite \
  --host 0.0.0.0 \
  --strict-port
```

#### GitHub PR Comments

```bash
# Post health delta comment to PR
node bin/dochealth.js pr-comment \
  --repo owner/repo \
  --pr 123 \
  --before-report ./base-report.json \
  --after-report ./head-report.json

# Dry run (preview comment without posting)
node bin/dochealth.js pr-comment \
  --repo owner/repo \
  --pr 123 \
  --after-report ./head-report.json \
  --dry-run
```

### Configuration

Create a `dochealth.config.js` file in your project root:

```javascript
module.exports = {
  // Protocol loading
  protocols: {
    directories: ['./src', './protocols'],
    include: ['**/*.js', '**/*.json'],
    exclude: ['**/*.test.js']
  },

  // Analysis thresholds
  thresholds: {
    healthScore: 80,          // Minimum passing score
    freshnessThreshold: 7,    // Days before docs considered stale
    coverageTarget: 0.9       // 90% coverage target
  },

  // Scoring weights
  weights: {
    freshness: 0.4,
    coverage: 0.4,
    validation: 0.2
  },

  // Output options
  output: {
    format: 'cli',            // 'cli' | 'json'
    colors: true,
    verbose: false
  },

  // Generator options
  generator: {
    templates: './templates',
    merge: true,              // Preserve existing content
    overwrite: false
  }
};
```

---

## Architecture

DocHealth operates as a three-layer system:

```
Protocol Manifests (src/)
    ↓
Analysis Engine (lib/)
    ↓
Output Layer (CLI, Dashboard, JSON, Markdown)
```

**Key Components:**
- **Protocol Loader** - Auto-discover and validate protocol manifests
- **Freshness Analyzer** - Detect stale documentation via timestamp comparison
- **Coverage Analyzer** - Identify documentation gaps across protocols
- **Documentation Generator** - Auto-generate Markdown from protocols
- **Health Reporter** - Calculate scores and generate actionable reports
- **Dashboard API** - Express server with SQLite for trend tracking
- **Web Dashboard** - React/Vite application for visualization

See [docs/technical_architecture.md](docs/technical_architecture.md) for full architecture details.

---

## Project Structure

```
DocHealth CLI & Dashboard/
├── bin/                   # CLI entry + sub-commands
│   ├── dochealth.js
│   └── commands/
├── lib/                   # Core analysis engine + generator pipeline
│   ├── loader.js
│   ├── analyzer.js
│   ├── generator-pipeline.js
│   ├── reporter.js
│   ├── serve.js
│   └── generators/
├── dashboard/             # Web dashboard (React + Vite)
│   ├── src/              # React frontend
│   ├── server/           # Express API + SQLite
│   └── tests/
├── src/                   # Protocol specifications
│   ├── api_protocol_v_1_1_1.js
│   ├── data_protocol_v_1_1_1.js
│   ├── Documentation Protocol — v1.1.1.js
│   ├── workflow_protocol_v_1_1_1.js
│   └── Semantic Protocol — v3.2.0.js
├── tests/                 # Unit, integration, and performance suites
├── docs/                  # Project documentation
│   ├── roadmap.md
│   ├── technical_architecture.md
│   ├── usage-guide.md
│   └── examples/
└── README.md              # This file
```

---

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Install dashboard dependencies
cd dashboard && npm install && cd ..
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Generate coverage report
npm run test:coverage

# Dashboard tests
cd dashboard && npm test
```

### Building

```bash
# Build dashboard for production
cd dashboard && npm run build && cd ..

# The dashboard/dist directory will contain static assets
# These are served by the Express server in production mode
```

---

## Documentation

- **[Technical Architecture](docs/technical_architecture.md)** - System design, APIs, and data models
- **[Generator Usage Guide](docs/usage-guide.md)** - CLI flags, merge behavior, and sample outputs
- **[Examples](docs/examples/)** - Sample Markdown outputs from generators
- **[Roadmap](docs/roadmap.md)** - Product vision and planned enhancements

---

## Planned Enhancements

**Near Term:**
- Auto-inference engine: `dochealth init` scans repo for OpenAPI files and auto-creates protocol manifests
- Plugin architecture for custom validators and generators
- Support for AsyncAPI and GraphQL schema documentation
- Multi-language code snippet generation (Python, JavaScript, Java, Go)

**Future:**
- Real-time documentation linting in IDE (VS Code extension)
- Semantic search across protocol-driven documentation
- Cloud-hosted dashboard (SaaS offering)
- Team collaboration features (multi-user, permissions)
- Slack/Discord notifications for health degradation
- Advanced analytics (developer journey tracking, doc effectiveness)

---

## Target Users

1. **API-First Startups** (50-200 employees)
   - Pain: Rapid API changes break documentation
   - Need: Automated freshness detection and generation

2. **Platform Engineering Teams**
   - Pain: Internal APIs and data schemas undocumented
   - Need: Coverage analysis and catalog generation

3. **Open-Source Projects**
   - Pain: Contributor docs lag behind code
   - Need: CI/CD integration for automated checks

---

## Success Metrics

- ✅ **Freshness Detection**: 95%+ accuracy in detecting stale docs
- ✅ **Coverage Analysis**: Identify 85%+ of undocumented API endpoints
- ✅ **CI/CD Integration**: Reliable exit codes for automation
- ✅ **Health Scoring**: Actionable 0-100 scores with prioritized recommendations
- ✅ **Dashboard**: Real-time visualization with historical trend tracking

---

## Differentiation

| Competitor | Approach | DocHealth Advantage |
|------------|----------|---------------------|
| **ReadMe, Mintlify** | Hosted platform; proprietary | Open protocols; self-hosted; Git-native |
| **Swagger UI, Redocly** | API-only | Multi-protocol (API + Data + Workflows + Docs) |
| **Docusaurus, MkDocs** | Static site generators | Health monitoring; auto-generation from protocols |
| **Vale** | Prose linting | Structural/semantic validation; cross-protocol linking |

**Core Thesis:** DocHealth is the missing **orchestration & health layer** that works WITH existing tools, not against them.

---

## License

MIT License - See LICENSE file for details

---

## Acknowledgments

- Built on existing protocol infrastructure (API, Data, Workflow, Documentation, Semantic)
- Research from technical documentation ecosystem analysis

---

## Contact & Support

- **Issues**: GitHub Issues (when repo is public)
- **Discussions**: GitHub Discussions (when repo is public)

---

**Last Updated**: 2025-11-17
