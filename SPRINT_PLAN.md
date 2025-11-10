# DocHealth CLI & Dashboard - Sprint Plan

**Created**: 2025-11-08
**Project**: Protocol-driven documentation health monitoring tool

---

## 🔍 Sprint 0: Discovery - Protocol Foundation

**Duration**: 2025-11-08 to 2025-11-09 (2 days)
**Status**: Current
**Goal**: Explore existing protocol APIs and create test fixtures to inform Sprint 1 implementation

### Why Sprint 0?

Before building the CLI, we need to:
1. **Understand what we have** - Document the ~70% existing protocol infrastructure
2. **Create test data** - Build realistic fixtures for testing freshness detection

### Missions

#### D0.1: Protocol API Surface Exploration
**Type**: Research
**Estimated**: 2 hours
**Priority**: P0

**Objective**: Document the consistent API patterns across all 9 protocols

**Deliverables**:
- Protocol API reference guide (`lib/docs/protocol-api-reference.md`)
- Factory function inventory with examples
- Built-in validator catalog

**Research Questions**:
- What are the common factory patterns across all protocols?
- How do built-in validators work (registration, execution)?
- What query syntax is supported by each protocol?
- How does diff detection and hashing work?

**Success Criteria**:
- All 9 protocols catalogued with factory functions
- Common patterns documented (validate, query, diff, hash)
- Quick reference guide ready for implementation team

---

#### D0.2: Create Test Fixtures for Freshness Detection
**Type**: Research
**Estimated**: 3 hours
**Priority**: P0
**Depends on**: D0.1

**Objective**: Create sample protocol manifests representing fresh, stale, and edge-case documentation states

**Deliverables**:
- `tests/fixtures/` directory with sample manifests
- Fresh docs fixture (code and docs updated same day)
- Stale docs fixture (code changed 38 days ago, docs unchanged)
- Missing timestamps fixture (edge case handling)
- Multiple protocol types (docs, API, data, workflow)

**Success Criteria**:
- At least 5 realistic test fixtures created
- Fixtures cover happy path, stale docs, and edge cases
- Each fixture validates against protocol schemas
- README documenting fixture purpose and usage

---

## 🚀 Sprint 1: CLI Core & Freshness Detection

**Duration**: 2025-11-10 to 2025-11-23 (2 weeks)
**Status**: Planned
**Goal**: Deliver working CLI that detects stale documentation and outputs health scores

### Sprint 1 Overview

Build the foundation of DocHealth CLI:
- ✅ Working `dochealth check` command
- ✅ Protocol loading and validation
- ✅ Freshness detection algorithm
- ✅ Health scoring (0-100)
- ✅ CI/CD integration (exit codes, JSON output)

**Total Estimated**: 24 hours (~3 days of focused work)

### Missions

#### M1.1: Build CLI Scaffold with Commander.js
**Type**: Implementation
**Estimated**: 4 hours
**Priority**: P0
**Depends on**: D0.1, D0.2

**Objective**: Create CLI entry point with Commander.js, define commands, implement exit codes

**Deliverables**:
- `bin/dochealth.js` with shebang and Commander.js setup
- `package.json` with dependencies (commander, chalk)
- Commands: check (full impl), generate (stub), diff (stub), init (stub)
- Exit code handling (0 = success, 1 = issues, 2 = error)

**Technical Notes**:
- Use Commander.js v11+ for argument parsing
- Chalk for color output (optional based on --no-color flag)
- Support `dochealth.config.js` for project defaults

**Success Criteria**:
- `node bin/dochealth.js --help` displays all commands
- `node bin/dochealth.js check` invokes placeholder function
- Exit codes work correctly
- CLI flags parsed (--json, --threshold, --config)

---

#### M1.2: Implement Protocol Loader
**Type**: Implementation
**Estimated**: 6 hours
**Priority**: P0
**Depends on**: M1.1, D0.1

**Objective**: Auto-discover and load protocol manifests from directory, validate using built-in validators

**Deliverables**:
- `lib/loader.js` with `loadProtocols()`, `loadProtocol()`, `validateProtocol()`
- Auto-discovery using glob patterns
- Protocol type detection (docs, api, data, workflow, semantic, etc.)
- Caching with invalidation on file change

**Technical Notes**:
- Reuse existing `createDocsProtocol()`, `createAPICatalog()` factories
- Use dynamic `import()` for ES module loading
- Map file patterns to protocol types
- Cache loaded protocols in memory

**Success Criteria**:
- Loads all 9 protocols from `src/` directory
- Returns array of protocol objects with `.manifest()` method
- Validates each protocol using built-in validators
- Handles errors gracefully (missing files, invalid manifests)

---

#### M1.3: Build Freshness Analyzer
**Type**: Implementation
**Estimated**: 6 hours
**Priority**: P0
**Depends on**: M1.2, D0.2

**Objective**: Detect stale documentation by comparing `last_code_change_at` vs `updated_at` timestamps

**Deliverables**:
- `lib/analyzer.js` with `analyzeFreshness()`, `checkStaleness()`, `calculateFreshnessScore()`
- Timestamp extraction from protocol manifests
- Staleness calculation (days since update)
- Severity assignment (critical, high, medium, low)

**Technical Notes**:
- Use `maintenance.freshness_check.last_code_change_at` field
- Compare against `lifecycle.updated_at` timestamp
- Default threshold: 7 days
- Integrate semantic criticality if available

**Success Criteria**:
- Detects stale docs using test fixtures from D0.2
- Returns 0-1 freshness score
- Lists stale protocols with severity and days old
- Handles missing timestamps gracefully

---

#### M1.4: Build Health Reporter
**Type**: Implementation
**Estimated**: 4 hours
**Priority**: P0
**Depends on**: M1.3

**Objective**: Calculate aggregate health score and generate CLI/JSON reports

**Deliverables**:
- `lib/reporter.js` with `calculateHealthScore()`, `generateCLIReport()`, `generateJSONReport()`
- Color-coded CLI output (green >=80, yellow 60-79, red <60)
- JSON export for CI/CD integration
- Actionable recommendations based on findings

**Technical Notes**:
- Sprint 1: `score = freshnessScore * 100` (simplified)
- Future: `score = 0.4*fresh + 0.4*coverage + 0.2*validation`
- Use chalk for color output
- Include exit code logic

**Success Criteria**:
- Calculates 0-100 health score from freshness (100% weight in Sprint 1)
- CLI report shows score, emoji, and stale docs list
- JSON output matches schema in technical architecture
- Recommendations suggest `dochealth generate` commands

---

#### M1.5: CLI Integration and Testing
**Type**: Implementation
**Estimated**: 4 hours
**Priority**: P0
**Depends on**: M1.1, M1.2, M1.3, M1.4

**Objective**: Wire up loader → analyzer → reporter pipeline, write tests, validate CI/CD integration

**Deliverables**:
- `bin/dochealth.js` fully wired with all components
- Unit tests for loader, analyzer, reporter (`tests/unit/`)
- Integration test with real protocols (`tests/integration/`)
- CI/CD example (GitHub Actions workflow)

**Technical Notes**:
- Test framework: Node.js native test runner or Jest
- Coverage: c8 or Jest coverage
- Mock file system for unit tests
- Use test fixtures from D0.2

**Success Criteria**:
- `dochealth check` runs end-to-end successfully
- Tests pass with 80%+ coverage
- Exit codes work in CI/CD scenarios
- README updated with usage examples

---

## 📊 Sprint 1 Definition of Done

```bash
# 1. CLI works
$ node bin/dochealth.js check
DocHealth Analysis Report
========================
Health Score: 92/100 ✅

No stale documentation detected.

Exit Code: 0

# 2. Detects staleness
$ node bin/dochealth.js check --threshold 90
DocHealth Analysis Report
========================
Health Score: 67/100 ⚠️

Stale Documentation:
  🔴 api-docs (45 days since code change, 12 days since doc update)
  🟡 workflow-docs (15 days old)

Exit Code: 1

# 3. JSON output for CI/CD
$ node bin/dochealth.js check --json
{
  "healthScore": 67,
  "freshness": { "score": 0.67, "stale": [...] }
}

# 4. Tests pass
$ npm test
✓ Protocol loader finds all protocols
✓ Freshness analyzer detects stale docs
✓ Health reporter calculates scores
✓ CLI integration end-to-end
Coverage: 85%
```

---

## ⚙️ Sprint 2: Coverage Analysis & URN Validation

**Duration**: 2025-11-24 to 2025-12-07 (2 weeks)  
**Status**: Planned  
**Goal**: Layer coverage detection, URN validation, and enhanced scoring/gap reporting on top of the Sprint 1 freshness pipeline so DocHealth can highlight undocumented surfaces with actionable detail.

### Sprint 2 Overview
- ✅ Coverage analyzer that cross-references API endpoints, data fields, and workflow nodes against documentation manifests
- ✅ URN resolver that validates `links.targets` against discoverable protocol elements
- ✅ Updated health score weighting (Freshness 40% / Coverage 40% / Validation 20%)
- ✅ Gap reporting surfaced in CLI + JSON output with severity and remediation tips

**Total Estimated**: 24 hours

### Missions

#### M2.1: Implement Coverage Analyzer
**Type**: Implementation • **Estimate**: 6h • **Priority**: P0 • **Depends on**: M1.3, M1.4  
**Objective**: Compute coverage metrics per protocol family and flag missing documentation artifacts.
**Deliverables**:
- Coverage extraction helpers (new module or analyzer extension) for API/Data/Workflow protocols
- Severity heuristics for gap classification
- Unit tests + fixtures representing undocumented endpoints/fields
**Success Criteria**:
- Coverage results returned per protocol with section references
- ≥3 gap categories detected (missing endpoint section, missing data field doc, missing workflow node)
- Analyzer output feeds reporter without breaking freshness logic

#### M2.2: Build URN Resolver & Link Validator
**Type**: Implementation • **Estimate**: 5h • **Priority**: P0 • **Depends on**: M2.1  
**Objective**: Validate cross-protocol URNs and surface broken references.
**Deliverables**:
- URN resolver utility + lookup table built from loaded protocols
- Validation errors with actionable remediation text
- Test suite covering valid/invalid namespaces, versions, anchors
**Success Criteria**:
- `dochealth check` reports invalid URNs with protocol + section references
- Resolver handles API/Data/Workflow namespaces and is extensible
- JSON output enumerates broken links for CI consumption

#### M2.3: Enhance Health Scoring with Coverage & Validation
**Type**: Implementation • **Estimate**: 4h • **Priority**: P0 • **Depends on**: M2.1, M2.2  
**Objective**: Weight freshness (40%), coverage (40%), validation (20%) and expose detailed metrics.
**Deliverables**:
- Updated `calculateHealthScore()` plus config overrides
- New metrics fields for coverage %, URN health, validation failures
- Unit tests covering weighting math and thresholds
**Success Criteria**:
- CLI shows multi-factor breakdown
- JSON schema updated with coverage + validation sections
- Backward compatibility maintained for existing scripts

#### M2.4: Gap Reporting & CLI Output Enhancements
**Type**: Implementation • **Estimate**: 5h • **Priority**: P0 • **Depends on**: M2.1, M2.2, M2.3  
**Objective**: Surface gap data (missing docs, invalid URNs) in CLI/JSON reports with severity + recommendations.
**Deliverables**:
- Gap sections in CLI and JSON output with toggles (`--gaps/--no-gaps`)
- Recommendations referencing `dochealth generate` commands where appropriate
- README updates with sample output/guidance
**Success Criteria**:
- Report lists top gaps sorted by severity with URN + file references
- Recommendations include fix path for each severity band
- Sample CLI/JSON output checked into docs for onboarding

#### M2.5: Coverage & URN Integration Tests
**Type**: Implementation • **Estimate**: 4h • **Priority**: P0 • **Depends on**: M2.1–M2.4  
**Objective**: Add end-to-end tests ensuring coverage + URN regression protection.
**Deliverables**:
- Extended fixtures with intentional coverage gaps and URN failures
- `tests/integration/coverage-and-urn.test.js`
- c8 coverage report demonstrating ≥80% on new modules
**Success Criteria**:
- `npm test` executes new integration suite
- `dochealth check` against fixture repo returns non-zero exit with descriptive messaging
- CI instructions updated to include coverage/URN checks

### Sprint 2 Definition of Done
```bash
$ node bin/dochealth.js check --json --gaps
{
  "health": {
    "score": 82,
    "breakdown": {
      "freshness": 85,
      "coverage": 78,
      "validation": 90
    }
  },
  "gaps": {
    "undocumentedEndpoints": [...],
    "invalidUrns": [...],
    "missingWorkflowDocs": [...]
  }
}

$ npm test
✔ coverage analyzer unit tests
✔ urn resolver unit tests
✔ coverage+urn integration suite
Coverage: 82%
```

**Additional Exit Criteria**
- Gap report lists severity + recommended follow-up command for every issue
- URN resolver supports API/Data/Workflow namespaces with extensibility hooks
- README + docs/roadmap include Sprint 2 feature summary and usage examples

---

## 🎯 Execution Strategy

### Week 1: Discovery + Foundation
**Days 1-2 (Sprint 0)**:
1. **D0.1**: Protocol API exploration (2 hours)
   - Examine all 9 protocol files
   - Document factory, validator, query, diff patterns
   - Create reference guide

2. **D0.2**: Create test fixtures (3 hours)
   - Build 5+ realistic protocol manifests
   - Cover fresh, stale, and edge cases
   - Validate against schemas

**Checkpoint**: Review findings, align on any adjustments before Sprint 1

### Week 2: Core Implementation
**Days 3-4**:
- **M1.1**: CLI scaffold (4 hours)
- **M1.2**: Protocol loader (6 hours)

**Days 5-6**:
- **M1.3**: Freshness analyzer (6 hours)
- **M1.4**: Health reporter (4 hours)

### Week 3: Integration + Testing
**Day 7**:
- **M1.5**: Integration and testing (4 hours)
- End-to-end validation
- Dog-fooding on DocHealth itself

---

## 🔄 Decision Points

### After Sprint 0 (Discovery)
**Review together**:
1. Are there any protocol API patterns we didn't expect?
2. Do the test fixtures accurately represent real-world scenarios?
3. Any adjustments needed to Sprint 1 missions based on findings?

### After M1.2 (Protocol Loader)
**Validate**:
- Can we load all 9 protocols successfully?
- Are validation errors clear and actionable?
- Any performance concerns with protocol loading?

### After M1.5 (Sprint 1 Complete)
**Retrospective**:
- Does `dochealth check` solve the freshness problem?
- What did we learn that affects Sprint 2 (Coverage Analysis)?
- Ready to dog-food on DocHealth documentation itself?

---

## 📦 Dependencies Introduced

### Sprint 0
- None (pure exploration and fixture creation)

### Sprint 1
- **Commander.js** (`^11.0.0`) - CLI argument parsing
- **Chalk** (`^5.0.0`) - Color output
- **Glob** or built-in - File pattern matching
- **Test Framework** - Node test runner or Jest
- **Coverage** - c8 or Jest coverage

---

## 🎓 Learning Outcomes

### Sprint 0
- Deep understanding of existing protocol infrastructure
- Confidence in reusing ~70% of built foundation
- Clear test strategy for Sprint 1

### Sprint 1
- Working knowledge of protocol-driven architecture
- CLI development best practices
- Freshness detection algorithm validated
- Foundation for Sprint 2 (Coverage) and Sprint 3 (Generation)

---

## 📝 Notes

- **Sprint 0 is intentionally short** (2 days) - focused discovery only
- **Sprint 1 is achievable** (24 hours estimated) - reuses existing infrastructure
- **No external API calls** in MVP - all local analysis
- **Dog-fooding strategy** - Use DocHealth on itself after M1.5
- **Checkpoint alignment** - Review Sprint 0 findings before proceeding to Sprint 1

---

## 🚦 Next Steps

1. **Start D0.1** - Protocol API exploration
2. **Complete D0.2** - Test fixtures
3. **Checkpoint** - Review findings together
4. **Proceed to Sprint 1** - CLI implementation

**Current Status**: Ready to begin Sprint 0 (Discovery)

---

**Last Updated**: 2025-11-08
**Managed via**: CMOS (cmos/missions/backlog.yaml)
**Database**: cmos/db/cmos.sqlite
