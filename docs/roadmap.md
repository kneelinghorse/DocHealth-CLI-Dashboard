# DocHealth CLI & Dashboard - Project Roadmap

## Vision Statement

**DocHealth** is a developer-first documentation orchestration tool that bridges the gap between modern development workflows and documentation quality. By leveraging protocol manifests as the single source of truth, DocHealth auto-generates documentation skeletons, monitors freshness through code-to-doc staleness detection, validates completeness via cross-protocol coverage analysis, and intelligently routes SME reviews based on semantic criticality.

The tool solves five critical pain points identified in the technical documentation ecosystem: documentation freshness & obsolescence, SME review bottlenecks, API-docs synchronization gaps, documentation coverage blindness, and cross-protocol linking chaos. Rather than replacing existing documentation tools, DocHealth augments them by providing the missing orchestration and health monitoring layer.

**Core Philosophy:** Protocol-driven documentation where machine-readable manifests serve as the authoritative source, enabling automated validation, generation, and continuous health monitoring integrated directly into CI/CD pipelines.

---

## Architecture Overview

### DocHealth System Design

DocHealth operates as a three-layer architecture combining existing protocol infrastructure with new orchestration and reporting capabilities:

```
┌─────────────────────────────────────────────────────────┐
│  Input: Protocol Manifests (JSON/YAML)                 │
│  - api_protocol_v_1_1_1.js                             │
│  - data_protocol_v_1_1_1.js                            │
│  - docs_protocol_v_1_1_1.js (Documentation Protocol)   │
│  - workflow_protocol_v_1_1_1.js                        │
│  - Semantic Protocol — v3.2.0.js                       │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  DocHealth Engine (Node.js/JavaScript)                 │
│                                                          │
│  1. Protocol Loader & Validator                         │
│     └─ Load all manifests, run built-in validators      │
│                                                          │
│  2. Cross-Protocol Linker                               │
│     └─ Resolve URN references, build dependency graph   │
│                                                          │
│  3. Freshness Analyzer                                  │
│     └─ Compare last_code_change vs last_doc_update      │
│     └─ Detect orphaned docs (no protocol binding)       │
│                                                          │
│  4. Coverage Calculator                                  │
│     └─ API endpoints without doc sections               │
│     └─ Data fields missing descriptions                 │
│     └─ Workflow steps undocumented                      │
│                                                          │
│  5. Doc Generator                                        │
│     └─ Skeleton Markdown from protocols                 │
│     └─ OpenAPI → API Reference (via existing logic)     │
│     └─ Mermaid diagrams (workflows, data lineage)       │
│                                                          │
│  6. Report Generator                                     │
│     └─ Health score (0-100)                             │
│     └─ Action items (prioritized by criticality)        │
│     └─ Diff summaries (breaking vs. significant)        │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Output Modes                                           │
│  - CLI: `dochealth check` (CI/CD integration)          │
│  - JSON Report: For dashboards/monitoring               │
│  - Markdown: Generated doc files                        │
│  - Dashboard: Web UI for visualization (Phase 3)        │
└─────────────────────────────────────────────────────────┘
```

**Key Architectural Decision**: Reuse ~70% of existing protocol infrastructure (factories, validators, query languages, diff detection) rather than rebuilding from scratch.

---

## Core Components

### 1. Protocol Loader

**Purpose:** Load and validate protocol manifests from the filesystem or package

**Key Features:**
- Auto-discovery of protocol manifests in project directories
- Schema validation using built-in protocol validators
- Caching for performance optimization
- Error reporting with actionable messages

**Technical Details:**
- Built on existing protocol factory functions
- Supports both JS modules and JSON manifests
- Zero external dependencies (reuses protocol infrastructure)
- Integration point: All other components consume loaded protocols

### 2. Freshness Analyzer

**Purpose:** Detect documentation staleness by comparing timestamps

**Key Features:**
- Compare `last_code_change_at` vs `updated_at` from Documentation Protocol
- Configurable staleness thresholds (default: 7 days)
- Detection of orphaned documentation (docs without code references)
- Prioritization based on semantic criticality scores

**Technical Details:**
- Uses Documentation Protocol's `maintenance.freshness_check` capability
- Integrates with Semantic Protocol for criticality scoring
- Outputs structured warnings with specific file/section references

### 3. Coverage Analyzer

**Purpose:** Identify documentation gaps across protocol boundaries

**Key Features:**
- API endpoints without corresponding doc sections
- Data schema fields missing descriptions
- Workflow steps without documentation
- URN validation across all cross-protocol links

**Technical Details:**
- Queries API Protocol for endpoint definitions
- Cross-references with Documentation Protocol navigation structure
- Uses URN resolution to validate links
- Reports coverage percentage by protocol type

### 4. Documentation Generator

**Purpose:** Auto-generate documentation skeletons from protocol manifests

**Key Features:**
- API reference Markdown from API Protocol
- Data catalog from Data Protocol schema definitions
- Workflow diagrams (Mermaid) from Workflow Protocol DAGs
- Skeleton outlines from Documentation Protocol navigation

**Technical Details:**
- Template-based generation (customizable)
- Preserves existing human-written content (merge strategy)
- Outputs standard Markdown compatible with SSGs (Docusaurus, MkDocs)
- Reverse OpenAPI generation from API Protocol

### 5. Health Reporter

**Purpose:** Generate actionable health reports with scores and recommendations

**Key Features:**
- Aggregate health score (0-100) based on freshness, coverage, and validation
- Prioritized action items using semantic criticality
- Trend tracking over time (stored in SQLite for dashboard)
- Multiple output formats (CLI, JSON, HTML)

**Technical Details:**
- Scoring algorithm: `score = 0.4*freshness + 0.4*coverage + 0.2*validation`
- Color-coded CLI output for quick scanning
- JSON schema for integration with other tools
- Diff summaries highlighting breaking vs. significant changes

### 6. CLI Interface

**Purpose:** Provide developer-friendly command-line access to all features

**Key Features:**
- `dochealth check` - Run full health analysis
- `dochealth generate [type]` - Auto-generate documentation
- `dochealth diff` - Show protocol changes since last run
- `dochealth init` - Initialize project with config

**Technical Details:**
- Commander.js for argument parsing
- Exit codes for CI/CD integration (0 = healthy, 1 = issues, 2 = critical)
- Streaming output for large projects
- Config file support (dochealth.config.js)

---

## Implementation Plan

### Sprint 1: CLI Core & Freshness Detection (Weeks 1-2)

**Goal:** Deliver a working CLI that can detect stale documentation

**Deliverables:**
- CLI scaffold with `dochealth check` command
- Protocol loader with auto-discovery
- Freshness analyzer with timestamp comparison
- Basic health scoring (freshness only)
- CI/CD integration with exit codes

**Tools/Features:**
```
- dochealth check: Load manifests, detect staleness, output score
- Protocol factories: Reuse createDocsProtocol(), createAPICatalog()
- Validators: Built-in protocol validation
- Output: CLI text + JSON for automation
```

**Success Criteria:**
- CLI runs against existing protocol manifests in `src/`
- Detects when code changed but docs didn't (using timestamps)
- Outputs health score and lists stale docs
- Exit code integration for CI/CD

### Sprint 2: Coverage Analysis & URN Validation (Weeks 3-4)

**Goal:** Add documentation coverage detection across protocols

**Deliverables:**
- Coverage analyzer for API endpoints, data fields, workflows
- URN resolver for cross-protocol link validation
- Enhanced health scoring (freshness + coverage)
- Detailed gap reporting with specific references

**Tools/Features:**
```
- Coverage calculator: Cross-reference protocols
- URN resolver: Validate links like urn:proto:api:endpoint@1.1.1
- Gap reporting: List undocumented API endpoints, data fields
- Score calculation: Combine freshness (40%) + coverage (40%) + validation (20%)
```

**Each analysis includes:**
- Specific file/section references for fixes
- Severity levels (critical, high, medium, low)
- Estimated effort to resolve (based on semantic complexity)

### Sprint 3: Documentation Generator (Weeks 5-6)

**Goal:** Auto-generate documentation from protocol manifests

**Deliverables:**
- `dochealth generate api` - API reference Markdown
- `dochealth generate data` - Data catalog documentation
- `dochealth generate workflows` - Mermaid workflow diagrams
- Skeleton generator for doc outlines
- Merge strategy to preserve human-written content

**Tools/Features:**
```
- API generator: API Protocol → Markdown tables + code examples
- Data generator: Data Protocol → Schema documentation
- Workflow generator: Workflow Protocol → Mermaid DAG diagrams
- Template system: Customizable output templates
```

**Success Criteria:**
- One-command generation of 70% of documentation content
- Generated docs compatible with Docusaurus, MkDocs
- Preserves existing content when regenerating
- Human review of generated content before commit

### Sprint 4: Dashboard MVP (Weeks 7-10)

**Goal:** Visualize documentation health with a web dashboard

**Deliverables:**
- React/Vite dashboard application
- Health score visualization with trend charts
- Stale docs list with drill-down details
- Coverage gap browser with protocol filtering
- GitHub integration for PR comments

**Tools/Features:**
```
- Dashboard: React + Vite + Chart.js
- API: Express server serving analysis results
- Database: SQLite for trend tracking over time
- GitHub bot: Post health delta comments on PRs
```

**Success Criteria:**
- `dochealth serve` launches dashboard at localhost:3000
- Historical trend tracking shows improvement over time
- Drill-down from health score to specific issues
- GitHub PR integration provides actionable feedback

---

## Technical Architecture

### Protocol Manifest Structure

```javascript
// Example: Documentation Protocol Manifest
const docsProtocol = {
  urn: 'urn:proto:docs:main@1.1.1',
  metadata: {
    name: 'Main Documentation',
    version: '1.1.1',
    owner: 'docs-team',
    created_at: '2025-01-01',
    updated_at: '2025-11-08'
  },
  navigation: {
    sections: [
      { id: 'getting-started', title: 'Getting Started', path: '/docs/getting-started.md' },
      { id: 'api', title: 'API Reference', urn: 'urn:proto:api:main@1.1.1' } // Cross-protocol link
    ]
  },
  maintenance: {
    freshness_check: {
      last_code_change_at: '2025-11-05',
      threshold_days: 7
    }
  },
  quality: {
    coverage: {
      target_percentage: 90,
      required_sections: ['authentication', 'error-handling']
    }
  }
};
```

### Health Scoring Algorithm

```javascript
/**
 * Calculate aggregate health score (0-100)
 *
 * @param {Object} freshnessScore - Freshness analysis results
 * @param {Object} coverageScore - Coverage analysis results
 * @param {Object} validationScore - Validation results
 * @returns {number} Health score 0-100
 */
function calculateHealthScore(freshnessScore, coverageScore, validationScore) {
  const weights = {
    freshness: 0.4,   // 40% weight - most critical
    coverage: 0.4,    // 40% weight - equally critical
    validation: 0.2   // 20% weight - hygiene
  };

  return Math.round(
    freshnessScore * weights.freshness * 100 +
    coverageScore * weights.coverage * 100 +
    validationScore * weights.validation * 100
  );
}
```

---

## Success Metrics

### Freshness Metrics
- **Stale Doc Detection Rate**: 95%+ accuracy in detecting docs out of sync with code
- **False Positive Rate**: <10% (docs flagged as stale but are actually current)
- **Mean Time to Detection**: <1 minute for CI/CD runs
- **Threshold Compliance**: 90%+ of docs updated within configured staleness window

### Coverage Metrics
- **API Coverage**: 85%+ of API endpoints have documentation sections
- **Data Coverage**: 90%+ of data fields have descriptions
- **Workflow Coverage**: 80%+ of workflow steps have docs
- **Cross-Protocol Links**: 95%+ of URN references resolve correctly

### Adoption Metrics
- **CI/CD Integration**: 100 CLI installs in first month
- **Health Score Improvement**: 20+ point average increase within 3 months of adoption
- **Documentation Velocity**: 50% reduction in manual doc writing time
- **SME Review Efficiency**: 30% reduction in review cycles via smart routing

---

## Integration with Existing Tools

DocHealth workflow integration:

```
Development Workflow:
1. Developer writes code + updates protocols
2. **DocHealth CI check** runs on PR ← Integration Point
3. Health delta posted as PR comment
4. Developer fixes gaps before merge
5. Auto-generated docs committed with code
```

**Value Add:**
- Catches documentation gaps before code is merged
- Provides actionable fix recommendations
- Automates 70% of documentation content generation
- Ensures documentation stays in sync with code

---

## Roadmap for Future Enhancements

### Near Term (Sprint 5-6)
**Priorities after MVP:**
- Auto-inference engine: `dochealth init` scans repo for openapi.yaml, detects schemas
- Plugin architecture for custom validators and generators
- Support for AsyncAPI and GraphQL schema documentation
- Multi-language code snippet generation (Python, JavaScript, Java, Go)

### Deferred (Post-MVP)
**Features on hold until user validation:**
- Real-time documentation linting in IDE (VS Code extension)
- Semantic search across protocol-driven documentation
- Automated translation management for multi-language docs
- Integration with component content management systems (CCMS)

### Medium Term (Months 6-12)
**Growth features:**
- Cloud-hosted dashboard (SaaS offering)
- Team collaboration features (multi-user, permissions)
- Slack/Discord notifications for health degradation
- Advanced analytics (developer journey tracking, doc effectiveness)

### Long Term (Year 2+)
**Vision items:**
- AI-powered documentation improvement suggestions
- Automated SME routing with machine learning
- Integration with major documentation platforms (ReadMe, Mintlify, GitBook)
- Enterprise features (SSO, audit logs, compliance reporting)

---

## Key Design Principles

1. **Protocol-First**: All features built on top of existing protocol infrastructure; protocols are the single source of truth

2. **Developer Experience**: CLI-first design with zero-config defaults; works seamlessly in CI/CD without setup

3. **Composability**: Each analyzer/generator is independent; can be used standalone or composed

4. **Incremental Adoption**: Teams can start with just `dochealth check` and add generation later

5. **Open Standards**: Output compatible with standard formats (Markdown, OpenAPI, Mermaid)

6. **Fail-Fast Validation**: Errors surfaced immediately with actionable fix recommendations

7. **Extensibility**: Plugin architecture allows custom validators, generators, and reporters

---

## Getting Started

### Quick Start

```bash
# Install globally
npm install -g dochealth

# Run health check in your project
cd your-project
dochealth check

# Output:
# DocHealth Analysis Report
# ========================
# Health Score: 67/100
#
# Issues Found:
#   - 3 API endpoints missing documentation
#   - 2 data schemas outdated (code changed 5d ago, docs 30d ago)
#   - 1 workflow step undocumented
#
# Run 'dochealth generate api' to auto-fix API documentation

# Generate API documentation
dochealth generate api --output docs/api-reference.md

# View detailed report as JSON
dochealth check --json > health-report.json
```

---

## Dependencies

**Core Dependencies:**
- Node.js 18+ (runtime)
- Existing protocol modules (src/) - zero npm dependencies
- Commander.js (CLI argument parsing)
- Markdown-it (Markdown generation)

**Optional Dependencies:**
- Chart.js (dashboard visualization)
- Express (dashboard API server)
- Better-sqlite3 (trend tracking database)

---

## Risks & Mitigations

**Risk:** Users may resist creating protocol manifests
**Mitigation:** Auto-inference engine (`dochealth init`) generates manifests from existing OpenAPI files, Git repos, and code

**Risk:** Generated documentation may lack human touch
**Mitigation:** Generator preserves existing content, only fills gaps; human review required before commit

**Risk:** Semantic criticality scoring may be inaccurate
**Mitigation:** Configurable weights and manual override; improve algorithm based on user feedback

**Risk:** Integration complexity with various SSGs (Docusaurus, MkDocs, etc.)
**Mitigation:** Start with 1-2 SSGs, expand via plugin architecture; focus on standard Markdown output

---

## Terminology

- **Protocol Manifest**: Machine-readable JSON/JS file describing APIs, data, workflows, or documentation
- **URN**: Uniform Resource Name for cross-protocol linking (e.g., `urn:proto:api:users@1.1.1`)
- **Freshness**: How recently documentation was updated relative to code changes
- **Coverage**: Percentage of code/API surface area with corresponding documentation
- **Health Score**: Aggregate 0-100 score combining freshness, coverage, and validation
- **Semantic Criticality**: AI-calculated importance score for prioritizing review and updates
- **SSG**: Static Site Generator (e.g., Docusaurus, MkDocs, Hugo)

---

*Protocol-driven documentation: Because your docs deserve the same rigor as your code.*
