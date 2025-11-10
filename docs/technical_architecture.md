# DocHealth CLI & Dashboard – Technical Architecture

## 0) Executive Summary

DocHealth solves the critical gap between modern development workflows and documentation quality by providing a protocol-driven orchestration layer. The tool leverages existing protocol infrastructure (~70% of required code already built) to auto-generate documentation, monitor freshness, validate coverage, and route SME reviews intelligently.

The architecture consists of three planes: (1) **Protocol Layer** - reuses existing API, Data, Workflow, Documentation, and Semantic protocols as the authoritative source; (2) **Analysis Engine** - loads manifests, runs cross-protocol validation, calculates health scores, and generates reports; (3) **Output Layer** - provides CLI commands, JSON APIs, generated Markdown, and (future) web dashboard for visualization.

Benefits include: deterministic documentation quality (protocol-based validation), 70% reduction in manual doc writing (auto-generation), continuous freshness monitoring (integrated in CI/CD), and intelligent prioritization (semantic criticality scoring). The architecture maintains a clear separation between protocol definitions (src/) and application logic (lib/, bin/), ensuring protocols remain reusable across other projects.

---

## 1) Goals / Non-Goals

### Goals
- Build a CLI tool that validates documentation health using existing protocol manifests as ground truth
- Auto-generate documentation skeletons from API, Data, Workflow, and Documentation protocols
- Detect staleness by comparing `last_code_change_at` vs `last_doc_update` timestamps
- Calculate coverage by cross-referencing protocols (e.g., API endpoints → doc sections)
- Provide actionable health scores and prioritized fix recommendations for CI/CD integration
- Reuse ~70% of existing protocol infrastructure (validators, query languages, diff detection)

### Non-Goals
- Replacing existing documentation platforms (Docusaurus, MkDocs, ReadMe) - we augment, not replace
- Building a full-featured static site generator - output is standard Markdown
- Real-time collaborative editing - focus is on automated analysis and generation
- Multi-tenant SaaS (MVP is local CLI) - cloud dashboard is future phase
- Supporting proprietary documentation formats - stick to open standards (Markdown, OpenAPI, Mermaid)

---

## 2) System Overview

```
┌────────────────────────┐
│ Input: Protocol        │
│ Manifests (src/)       │
│ - api_protocol         │
│ - data_protocol        │
│ - docs_protocol        │
│ - workflow_protocol    │
│ - semantic_protocol    │
└────────┬───────────────┘
         │ load
         ▼
┌─────────────────────────────────────┐
│ Analysis Engine (lib/)              │
│                                     │
│  ┌─────────────┐  ┌──────────────┐ │
│  │ Loader      │  │ Validator    │ │
│  └──────┬──────┘  └──────┬───────┘ │
│         │                │         │
│         ▼                ▼         │
│  ┌─────────────────────────────┐  │
│  │ Cross-Protocol Linker       │  │
│  │ (URN resolution)            │  │
│  └──────────┬──────────────────┘  │
│             │                      │
│    ┌────────┼────────┐            │
│    ▼        ▼        ▼            │
│ ┌─────┐ ┌───────┐ ┌─────────┐    │
│ │Fresh│ │Cover- │ │Semantic │    │
│ │ness │ │age    │ │Critic.  │    │
│ └──┬──┘ └───┬───┘ └────┬────┘    │
│    │        │          │          │
│    └────────┼──────────┘          │
│             ▼                      │
│      ┌────────────┐                │
│      │ Reporter   │                │
│      │ (scoring)  │                │
│      └──────┬─────┘                │
└─────────────┼──────────────────────┘
              │
         ┌────┴────────────┐
         ▼                 ▼
   ┌──────────┐      ┌──────────┐
   │ CLI      │      │ Generator│
   │ (bin/)   │      │ (lib/)   │
   └────┬─────┘      └────┬─────┘
        │                 │
        ▼                 ▼
   Exit codes        Markdown files
   JSON reports      OpenAPI specs
```

**Control Plane**: CLI commands (bin/dochealth.js) orchestrate analysis by invoking the Analysis Engine. Configuration loaded from `dochealth.config.js` or CLI flags. Exit codes signal CI/CD pass/fail.

**Data Plane**: Protocol manifests (src/) are loaded into memory, cross-referenced via URN resolution, analyzed for freshness/coverage, scored, and output as reports or generated documentation.

**Future**: Dashboard (dashboard/) serves HTTP API, stores historical data in SQLite, renders React UI for visualization.

---

## 3) Core Components

### Protocol Loader (`lib/loader.js`)

**Purpose:** Discover, load, and validate protocol manifests from the filesystem

**Responsibilities:**
- Auto-discover protocol manifests in configurable directories (default: `./src`, `./protocols`)
- Load JavaScript modules or JSON files as protocol manifests
- Run built-in protocol validators to ensure schema compliance
- Cache loaded protocols for performance (invalidate on file change)
- Provide error messages with file paths and validation failures

**Technology/Implementation:** Pure Node.js with native module loading; zero npm dependencies; reuses protocol factory functions from `src/`

**Key Functions:**
```javascript
// Load all protocols from directory
async function loadProtocols(directory = './src')

// Load specific protocol by URN
async function loadProtocol(urn)

// Validate protocol manifest
function validateProtocol(manifest, type)
```

### Freshness Analyzer (`lib/analyzer.js`)

**Purpose:** Detect stale documentation by comparing code and doc timestamps

**Responsibilities:**
- Extract `last_code_change_at` from protocol metadata (Git commit dates)
- Compare against `updated_at` timestamps in Documentation Protocol
- Calculate staleness score (0-1) based on configured thresholds
- Identify orphaned documentation (docs without protocol bindings)
- Prioritize stale docs using Semantic Protocol criticality scores

**Technology/Implementation:** Uses Documentation Protocol's `maintenance.freshness_check`; integrates with Git for commit timestamps; pure JavaScript

**Key Functions:**
```javascript
// Analyze freshness for all protocols
async function analyzeFreshness(protocols, config)

// Check single protocol staleness
function checkStaleness(protocol, threshold)

// Calculate freshness score (0-1)
function calculateFreshnessScore(protocols)
```

### Coverage Analyzer (`lib/analyzer.js`)

**Purpose:** Identify documentation gaps across protocol boundaries

**Responsibilities:**
- Query API Protocol for all endpoint definitions
- Cross-reference with Documentation Protocol navigation sections
- Identify API endpoints, data fields, workflow steps without docs
- Validate all URN cross-protocol links resolve correctly
- Calculate coverage percentage by protocol type

**Technology/Implementation:** URN-based cross-referencing; uses protocol query languages; pure JavaScript

**Key Functions:**
```javascript
// Analyze coverage for all protocols
async function analyzeCoverage(protocols)

// Find undocumented API endpoints
function findUndocumentedEndpoints(apiProtocol, docsProtocol)

// Validate URN references
function validateURNs(protocols)
```

### Documentation Generator (`lib/generator.js`)

**Purpose:** Auto-generate documentation Markdown from protocol manifests

**Responsibilities:**
- Generate API reference tables from API Protocol endpoint definitions
- Create data catalog documentation from Data Protocol schemas
- Render Mermaid diagrams from Workflow Protocol DAGs
- Build skeleton documentation outlines from Documentation Protocol navigation
- Preserve existing human-written content (merge strategy)

**Technology/Implementation:** Template-based generation with Markdown-it; Mermaid for diagrams; pure JavaScript

**Key Functions:**
```javascript
// Generate API reference Markdown
async function generateAPIReference(apiProtocol, options)

// Generate data catalog
async function generateDataCatalog(dataProtocol, options)

// Generate workflow diagrams
async function generateWorkflowDocs(workflowProtocol, options)
```

### Health Reporter (`lib/reporter.js`)

**Purpose:** Calculate aggregate health scores and generate actionable reports

**Responsibilities:**
- Combine freshness, coverage, and validation scores into 0-100 health score
- Prioritize action items using semantic criticality
- Generate CLI text output (color-coded)
- Export JSON reports for CI/CD and dashboard consumption
- Track trends over time (write to SQLite for dashboard)

**Technology/Implementation:** Scoring algorithm with configurable weights; supports multiple output formats; pure JavaScript

**Key Functions:**
```javascript
// Calculate aggregate health score
function calculateHealthScore(freshness, coverage, validation)

// Generate CLI report
function generateCLIReport(analysis, options)

// Export JSON report
function exportJSONReport(analysis)
```

### CLI Interface (`bin/dochealth.js`)

**Purpose:** Provide developer-friendly command-line interface to all features

**Responsibilities:**
- Parse command-line arguments and flags
- Load configuration from `dochealth.config.js`
- Invoke Analysis Engine with appropriate options
- Display formatted output to stdout/stderr
- Set appropriate exit codes for CI/CD integration

**Technology/Implementation:** Commander.js for argument parsing; chalk for color output; Node.js

**Commands:**
```bash
# Run full health analysis
dochealth check [--json] [--threshold <score>]

# Generate documentation
dochealth generate <type> [--output <path>]

# Show protocol diffs
dochealth diff [--since <date>]

# Initialize project
dochealth init
```

---

## 4) Primary Interface/API

### CLI Command: `dochealth check`

**Input:**
- `--config <path>`: Path to config file (default: `./dochealth.config.js`)
- `--json`: Output JSON instead of CLI text
- `--threshold <score>`: Fail if health score below threshold (default: 70)
- `--protocols <dir>`: Directory to scan for protocols (default: `./src`)

**Output:**
```
DocHealth Analysis Report
========================
Health Score: 67/100 ⚠️

Issues Found:
  🔴 CRITICAL (3)
    - API endpoint POST /users missing documentation
    - Data field User.email missing description
    - Workflow step "validate-payment" undocumented

  🟡 HIGH (2)
    - API documentation stale (code changed 12d ago, docs 45d ago)
    - Data schema outdated (last update 30d ago)

  🔵 MEDIUM (1)
    - Workflow diagram missing for checkout flow

Recommendations:
  1. Run 'dochealth generate api' to auto-fix API documentation
  2. Update User schema documentation in docs/data-models.md
  3. Add workflow diagram for checkout flow

Exit Code: 1 (issues found)
```

**Exit Codes:**
- `0`: Health score meets threshold, no critical issues
- `1`: Issues found or score below threshold
- `2`: Invalid configuration or runtime error

**JSON Output:**
```json
{
  "healthScore": 67,
  "timestamp": "2025-11-08T12:00:00Z",
  "freshness": {
    "score": 0.6,
    "stale": [
      {
        "protocol": "urn:proto:api:main@1.1.1",
        "lastCodeChange": "2025-10-27",
        "lastDocUpdate": "2025-09-24",
        "daysSinceUpdate": 45,
        "severity": "high"
      }
    ]
  },
  "coverage": {
    "score": 0.75,
    "gaps": [
      {
        "type": "api-endpoint",
        "protocol": "urn:proto:api:main@1.1.1",
        "endpoint": "POST /users",
        "severity": "critical"
      }
    ]
  },
  "validation": {
    "score": 0.95,
    "issues": []
  }
}
```

### CLI Command: `dochealth generate`

**Input:**
- `<type>`: Type of documentation to generate (`api`, `data`, `workflows`, `all`)
- `--output <path>`: Output file path
- `--template <path>`: Custom template file
- `--merge`: Preserve existing content (default: true)

**Output:** Generated Markdown files written to specified paths

**Behavior:** Loads protocols, runs generators, writes Markdown files; errors if protocols missing or invalid

---

## 5) Internal Service APIs

### API: Protocol Loader

**Function:** `loadProtocols(directory: string): Promise<Protocol[]>`

**Request:** Directory path containing protocol manifests

**Response:** Array of loaded and validated protocol objects

**Purpose:** Load all protocol manifests from a directory for analysis

**Transport:** In-process function call (not HTTP)

**Error Handling:** Throws error if directory not found or protocols invalid

### API: Cross-Protocol Linker

**Function:** `resolveURN(urn: string, protocols: Protocol[]): Protocol | null`

**Request:** URN string (e.g., `urn:proto:api:users@1.1.1`) and loaded protocols

**Response:** Resolved protocol object or null if not found

**Purpose:** Resolve cross-protocol URN references for coverage analysis

**Transport:** In-process function call

**Error Handling:** Returns null for unresolvable URNs; logs warning

### API: Health Scorer

**Function:** `calculateHealthScore(analysis: Analysis): number`

**Request:** Analysis results from freshness, coverage, validation

**Response:** Health score 0-100

**Purpose:** Calculate aggregate health score with configurable weights

**Transport:** In-process function call

**Algorithm:**
```javascript
score = 0.4 * freshnessScore + 0.4 * coverageScore + 0.2 * validationScore
```

---

## 6) Data Model

### Entity: `ProtocolManifest`

- `urn` (string) | Unique protocol identifier | primary key | e.g., `urn:proto:api:main@1.1.1`
- `metadata` (object) | Protocol metadata | required
  - `name` (string) | Human-readable name
  - `version` (string) | Semantic version
  - `created_at` (string) | ISO timestamp
  - `updated_at` (string) | ISO timestamp
- `content` (object) | Protocol-specific content | varies by type

Relationships: May reference other protocols via URNs in `content` fields

Indexes: `urn`, `metadata.updated_at`

### Entity: `HealthAnalysis`

- `timestamp` (string) | ISO timestamp of analysis | required
- `healthScore` (number) | Aggregate score 0-100 | required
- `freshness` (object) | Freshness analysis results
  - `score` (number) | 0-1 freshness score
  - `stale` (array) | List of stale protocol references
- `coverage` (object) | Coverage analysis results
  - `score` (number) | 0-1 coverage score
  - `gaps` (array) | List of documentation gaps
- `validation` (object) | Validation results
  - `score` (number) | 0-1 validation score
  - `issues` (array) | List of validation failures

Relationships: References `ProtocolManifest` via URNs

Storage: Written to SQLite for dashboard trend tracking (future)

### Entity: `DocumentationGap`

- `type` (string) | Gap type (`api-endpoint`, `data-field`, `workflow-step`)
- `protocol` (string) | URN of protocol with gap
- `reference` (string) | Specific endpoint/field/step missing docs
- `severity` (string) | `critical`, `high`, `medium`, `low`
- `estimatedEffort` (number) | Minutes to fix (from semantic protocol)

---

## 7) Canonical Flows

### Flow: Health Check in CI/CD

1. Developer pushes code + protocol updates to Git branch
2. CI/CD pipeline runs `dochealth check --threshold 80 --json`
3. DocHealth loads protocols from `src/`, runs freshness and coverage analysis
4. If health score ≥ 80, exit code 0, CI passes
5. If health score < 80, exit code 1, CI fails; JSON report attached to PR
6. Developer reviews report, fixes gaps, re-pushes
7. CI re-runs, passes

**Errors:** Missing protocols → exit 2 (configuration error); invalid protocols → exit 2 (validation error)

### Flow: Auto-Generate API Documentation

1. Developer runs `dochealth generate api --output docs/api-reference.md`
2. DocHealth loads API Protocol from `src/api_protocol_v_1_1_1.js`
3. Generator extracts endpoint definitions, parameters, responses
4. Markdown template rendered with endpoint data
5. If `docs/api-reference.md` exists and `--merge` flag, preserve human-written sections
6. Write generated Markdown to output file
7. Developer reviews, commits to Git

**Errors:** API Protocol not found → error message with search paths; output file not writable → permission error

### Flow: Freshness Detection

1. DocHealth reads Git commit history for files in `src/`
2. Extracts `last_code_change_at` timestamp from most recent commit
3. Loads Documentation Protocol, reads `updated_at` timestamp
4. Calculates staleness: `daysSinceUpdate = (today - updated_at) - (today - last_code_change_at)`
5. If `daysSinceUpdate > threshold` (default 7 days), mark as stale
6. Loads Semantic Protocol, calculates criticality score
7. Prioritizes stale docs by criticality (critical first)
8. Returns list of stale protocols with severity and recommended actions

---

## 8) Performance, Caching & SLOs

### SLO Targets

- `protocol.load.latency` ≤ 500ms (p95) for loading 50 protocols
- `analysis.full.latency` ≤ 5s (p95) for complete health check
- `generate.api.latency` ≤ 2s (p95) for API reference generation
- `cli.startup.latency` ≤ 200ms (p95) for CLI init

### Caching Strategy

**Layer:** Protocol Manifest Cache (in-memory)
- **What:** Parsed protocol objects
- **TTL:** Until file modification detected (fs.watch)
- **Invalidation:** File change, explicit `--no-cache` flag

**Layer:** URN Resolution Cache (in-memory)
- **What:** URN → Protocol object mappings
- **TTL:** Same as protocol manifest cache
- **Invalidation:** When any protocol reloaded

### Optimization Strategies

- Lazy load protocols (only load when needed for specific analysis)
- Parallel protocol loading (Promise.all for independent loads)
- Streaming output for large reports (avoid buffering in memory)
- Pre-compute protocol hashes for fast diff detection

---

## 9) Security, Governance, Cost Controls

### Authentication (AuthN)

- Local CLI: Runs with user's filesystem permissions
- Dashboard (future): Optional GitHub OAuth for multi-user access

### Authorization (AuthZ)

- File system permissions control protocol manifest access
- Dashboard (future): Role-based access control (viewer, editor, admin)

### Quotas & Rate Limits

- No external API calls in MVP (all local analysis)
- Dashboard (future): Rate limit HTTP API (100 req/min per user)

### Audit Trail

- CLI logs all commands to `~/.dochealth/history.log`
- Dashboard (future): Audit log table in SQLite for all changes

### Cost Controls

- Zero cloud costs for MVP (local CLI only)
- Dashboard (future): SQLite limits database growth; archive old analyses

---

## 10) Observability

### Metrics

**System Metrics:**
- `cli.invocations`: Count of CLI commands run (by type)
- `analysis.duration_ms`: Time for health check analysis (p50, p95, p99)
- `protocols.loaded`: Number of protocols loaded per analysis
- `health_score`: Distribution of health scores across runs

**Quality Metrics:**
- `freshness.stale_count`: Number of stale protocols detected
- `coverage.gap_count`: Number of documentation gaps found
- `validation.error_count`: Number of validation failures

### Logging

- CLI logs to stderr (errors) and stdout (results)
- Log levels: `debug`, `info`, `warn`, `error`
- Configurable via `--log-level` flag or `DOCHEALTH_LOG_LEVEL` env var

### Events (Future Dashboard)

- `health_check.completed`: Triggered after analysis; payload includes score and gap count
- `documentation.generated`: Triggered after generation; payload includes type and output path
- `protocol.updated`: Triggered when protocol manifest file changes; payload includes URN

---

## 11) Deployment & Release

### Deployment Architecture

- **CLI**: Distributed as npm package (`npm install -g dochealth`)
- **Protocols**: Bundled with CLI or loaded from user's project
- **Dashboard**: Future SaaS deployment (Node.js + React on Vercel/Railway)

**Environments:**
- **Local**: Developer machine (CLI only)
- **CI/CD**: GitHub Actions, GitLab CI, etc. (CLI in headless mode)
- **Dashboard**: Cloud-hosted (future)

### Release Process

1. Update version in `package.json` (semantic versioning)
2. Run test suite (`npm test`)
3. Generate changelog from Git commits
4. Tag release in Git (`git tag v1.0.0`)
5. Publish to npm (`npm publish`)
6. Create GitHub release with notes

### Disaster Recovery

- **CLI**: Users can reinstall from npm
- **Protocols**: Version-controlled in Git (rollback via Git)
- **Dashboard data**: SQLite backups, point-in-time restore

---

## 12) Testing & Benchmarking

### Unit/Integration Tests

- **Protocol Loader**: Test loading valid/invalid manifests, caching, error handling
- **Analyzers**: Test freshness detection, coverage calculation, URN resolution
- **Generators**: Test API/data/workflow doc generation with fixtures
- **CLI**: Test command parsing, exit codes, output formats

### Quality Benchmarks

- **Code Coverage**: 80%+ line coverage (measured with c8)
- **Protocol Validator**: 100% of known invalid manifests rejected
- **URN Resolution**: 100% of valid URNs resolve correctly

### Resilience Testing

- **Missing Protocols**: CLI handles gracefully with error message
- **Invalid Manifests**: Validation errors reported with file path
- **Large Projects**: Test with 100+ protocols (performance target: <10s)

### Performance/Load Testing

- **Scenario**: 50 protocol manifests, full health check
- **Target**: <5s p95 latency
- **Metrics**: CPU usage, memory consumption, file I/O

---

## 13) Reference Interfaces

### Config File Schema (`dochealth.config.js`)

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

### Health Analysis JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "healthScore": { "type": "number", "minimum": 0, "maximum": 100 },
    "timestamp": { "type": "string", "format": "date-time" },
    "freshness": {
      "type": "object",
      "properties": {
        "score": { "type": "number", "minimum": 0, "maximum": 1 },
        "stale": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "protocol": { "type": "string" },
              "lastCodeChange": { "type": "string", "format": "date" },
              "lastDocUpdate": { "type": "string", "format": "date" },
              "daysSinceUpdate": { "type": "integer" },
              "severity": { "enum": ["critical", "high", "medium", "low"] }
            }
          }
        }
      }
    },
    "coverage": { "type": "object" },
    "validation": { "type": "object" }
  },
  "required": ["healthScore", "timestamp"]
}
```

---

## 14) Roadmap

### MVP (Sprint 1-2) - Weeks 1-4

**Deliverables:**
- CLI scaffold with `dochealth check` command
- Protocol loader with auto-discovery and validation
- Freshness analyzer with Git integration
- Basic health scoring (freshness only)
- CI/CD integration with exit codes and JSON output

### Enhancement (Sprint 3-4) - Weeks 5-8

**Deliverables:**
- Coverage analyzer (API endpoints, data fields, workflows)
- URN resolver for cross-protocol link validation
- Enhanced health scoring (freshness + coverage + validation)
- Documentation generator (`generate api`, `generate data`, `generate workflows`)

### Dashboard (Sprint 5-6) - Weeks 9-12

**Deliverables:**
- React/Vite dashboard application
- SQLite trend tracking database
- Health score visualization with Chart.js
- GitHub PR integration (comment bot)

### Future Phases

**Auto-Inference (Month 4):**
- `dochealth init` scans repo, auto-creates protocol manifests from OpenAPI, schemas
- Lowers adoption barrier to near-zero

**Plugins (Month 5-6):**
- Plugin architecture for custom validators, generators
- Community-contributed plugins (AsyncAPI, GraphQL, etc.)

**Cloud Dashboard (Month 7-12):**
- SaaS offering with team collaboration
- Slack/Discord notifications
- Advanced analytics and trend tracking

---

## 15) Open Questions

**Q1: Should we support protocol manifests in YAML format or stick to JS/JSON?**
- **Context:** YAML is popular in Kubernetes/OpenAPI ecosystems
- **Options:** (a) JS/JSON only, (b) Add YAML support via js-yaml dependency
- **Decision needed:** Sprint 1 (affects loader implementation)

**Q2: How do we handle protocol versioning when generating docs?**
- **Context:** API may have v1 and v2 endpoints; docs need to support both
- **Options:** (a) Generate separate docs per version, (b) Unified docs with version tabs
- **Decision needed:** Sprint 3 (affects generator design)

**Q3: Should semantic criticality scoring be configurable or auto-calculated?**
- **Context:** Some teams may want manual priority assignment vs. AI-calculated scores
- **Options:** (a) Auto-only, (b) Manual override, (c) Hybrid (auto + override)
- **Decision needed:** Sprint 2 (affects analyzer design)

**Q4: What's the dashboard deployment model - self-hosted or SaaS?**
- **Context:** Teams may want on-premise vs. cloud-hosted
- **Options:** (a) SaaS only, (b) Self-hosted only, (c) Both (Docker image + SaaS)
- **Decision needed:** Sprint 4 (affects architecture)

---

**Last Updated**: 2025-11-08
**Status**: Architecture design complete, ready for Sprint 1 implementation
**Next Steps**: Build CLI scaffold, implement protocol loader and freshness analyzer
