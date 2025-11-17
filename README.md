# DocHealth CLI & Dashboard

**A protocol-driven documentation orchestration tool for developers**

[![Status](https://img.shields.io/badge/status-MVP%20Phase-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## Overview

DocHealth is a developer-first documentation health monitoring and auto-generation tool that uses protocol manifests as the single source of truth. It solves critical pain points in modern technical documentation workflows:

- 📊 **Freshness Monitoring** - Automatically detect when code changes but documentation doesn't
- 🔍 **Coverage Analysis** - Identify API endpoints, data fields, and workflows without documentation
- 🤖 **Auto-Generation** - Generate documentation skeletons from protocol manifests
- ✅ **CI/CD Integration** - Built-in health checks with exit codes for automated pipelines
- 🎯 **Smart Prioritization** - Semantic criticality scoring for intelligent SME routing

**Built on ~70% existing protocol infrastructure** - API, Data, Workflow, Documentation, and Semantic protocols.

---

## Quick Start

```bash
# Install dependencies
npm install

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

## Project Status

**Current Phase:** Sprint 3 - Generator Integration & CLI Commands

### Completed ✅
- [x] Viability assessment and research
- [x] CMOS setup and initialization
- [x] Project roadmap and technical architecture
- [x] Protocol infrastructure (src/) - 70% of foundation
- [x] CLI scaffold, protocol loader, analyzers, and reporters
- [x] URN resolver plus semantic merge tooling
- [x] API/Data/Workflow generators with Stage 1/Stage 2 pipelines
- [x] `dochealth generate` command with auto-merge + performance tests

### In Progress 🚧
- [ ] Hardening generator pipeline benchmarks and docs
- [ ] Usage documentation + examples for regeneration workflows
- [ ] Dashboard planning (Sprint 4)

### Upcoming 📋
- [ ] Dashboard & monitoring surfaces
- [ ] Continuous freshness daemons
- [ ] SME routing & alerting

---

## Architecture

DocHealth operates as a three-layer system:

```
Protocol Manifests (src/)
    ↓
Analysis Engine (lib/)
    ↓
Output Layer (CLI, JSON, Markdown)
```

**Key Components:**
- **Protocol Loader** - Auto-discover and validate protocol manifests
- **Freshness Analyzer** - Detect stale documentation via timestamp comparison
- **Coverage Analyzer** - Identify documentation gaps across protocols
- **Documentation Generator** - Auto-generate Markdown from protocols
- **Health Reporter** - Calculate scores and generate actionable reports

See [docs/technical_architecture.md](docs/technical_architecture.md) for full architecture details.

---

## Documentation

- **[Roadmap](docs/roadmap.md)** - Product vision, sprints, and success metrics
- **[Technical Architecture](docs/technical_architecture.md)** - System design, APIs, and data models
- **[Generator Usage Guide](docs/usage-guide.md)** - CLI flags, merge behavior, and sample outputs
- **[Examples](docs/examples/)** - Snapshot Markdown from the generators
- **[GitHub PR Integration](docs/github_pr_integration.md)** - Setup for health delta comments in pull requests
- **[Viability Assessment](VIABILITY_ASSESSMENT.md)** - Market validation and business case
- **[CMOS Documentation](cmos/docs/)** - Project management system guides

---

## Project Structure

```
DocHealth CLI & Dashboard/
├── bin/                   # CLI entry + sub-commands (generate, merge, resolve)
│   ├── dochealth.js
│   └── commands/
├── lib/                   # Core analysis engine + generator pipeline
│   ├── loader.js
│   ├── analyzer.js
│   ├── generator-pipeline.js
│   └── generators/
├── src/                   # Protocol specifications (70% of infrastructure)
│   ├── api_protocol_v_1_1_1.js
│   ├── data_protocol_v_1_1_1.js
│   ├── Documentation Protocol — v1.1.1.js
│   ├── workflow_protocol_v_1_1_1.js
│   └── Semantic Protocol — v3.2.0.js
├── tests/                 # Unit, integration, and performance suites
│   ├── integration/
│   ├── performance/
│   └── unit/
├── docs/                  # Project docs + user-facing guides/examples
│   ├── roadmap.md
│   ├── technical_architecture.md
│   ├── usage-guide.md
│   └── examples/
├── cmos/                  # CMOS project management (separate!)
│   ├── agents.md          # CMOS operational instructions
│   ├── db/                # SQLite mission tracking
│   └── docs/              # CMOS documentation
├── agents.md              # AI agent instructions for THIS project
└── README.md              # This file
```

**Important:** Never write application code in `cmos/` - that's for project management only.

---

## Development

### Prerequisites

- Node.js 18+ (for CLI and dashboard)
- Python 3.11+ (for CMOS scripts)
- Git (for freshness detection)

### Setup

```bash
# Install Node.js dependencies (when package.json is created)
npm install

# Install Python dependencies for CMOS
pip install PyYAML

# Initialize CMOS database (already done)
python cmos/scripts/seed_sqlite.py

# Verify setup
ls -la agents.md cmos/agents.md docs/*.md
```

### Testing

```bash
# Run all tests (when implemented)
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Generate coverage report
npm run test:coverage
```

---

## CMOS Integration

This project uses the **CMOS (Context + Mission Orchestration System)** for project management:

- **Mission Tracking** - SQLite-backed sprint and task management
- **Context Management** - PROJECT_CONTEXT and MASTER_CONTEXT
- **Session Logging** - Complete build session history
- **Validation** - Automated guardrails for code quality

### Key CMOS Commands

```bash
# View current mission
./cmos/cli.py db show current

# View backlog
./cmos/cli.py db show backlog

# Add a new mission
./cmos/cli.py mission add <id> "<name>" --sprint "Sprint 01"

# Export research report
./cmos/cli.py research export <mission-id>
```

See [cmos/docs/getting-started.md](cmos/docs/getting-started.md) for full CMOS documentation.

---

## Contributing

**For Contributors:**

1. Read [agents.md](agents.md) for coding standards and project structure
2. Read [cmos/agents.md](cmos/agents.md) for CMOS operations
3. Follow the sprint roadmap in [docs/roadmap.md](docs/roadmap.md)
4. Never write application code in `cmos/` directory

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

## Success Metrics (MVP Goals)

- ✅ **Freshness Detection**: 95%+ accuracy in detecting stale docs
- ✅ **Coverage Analysis**: Identify 85%+ of undocumented API endpoints
- ✅ **CI/CD Integration**: Reliable exit codes for automation
- ✅ **Health Scoring**: Actionable 0-100 scores with prioritized recommendations

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
- CMOS project management system
- Research from technical documentation ecosystem analysis

---

## Contact & Support

- **Issues**: GitHub Issues (when repo is public)
- **Discussions**: GitHub Discussions (when repo is public)
- **Project Management**: CMOS mission tracking

---

**Last Updated**: 2025-11-08
**Status**: Sprint 1 (CLI Core) - Ready to Build
**Next**: Implement CLI scaffold and protocol loader
