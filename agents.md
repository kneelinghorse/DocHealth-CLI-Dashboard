# AI Agent Configuration

**Project Name**: DocHealth CLI & Dashboard
**Project Type**: CLI Tool & Web Dashboard
**Primary Language**: JavaScript/Node.js
**Framework**: Node.js (CLI), React/Vite (Dashboard)

**Description**: A protocol-driven documentation orchestration tool that uses protocol manifests as the single source of truth to auto-generate documentation, monitor freshness, validate completeness, and route SME reviews intelligently.

---

## Project Overview

DocHealth is a developer-first documentation health monitoring and auto-generation CLI tool with a web dashboard. It leverages existing protocol infrastructure (API, Data, Workflow, Documentation, Semantic protocols) to:

1. Auto-generate documentation skeletons from protocol manifests
2. Monitor freshness by detecting code→protocol→doc staleness chains
3. Validate completeness via coverage analysis across linked protocols
4. Route SME reviews intelligently based on semantic criticality
5. Export to standard formats (Markdown, Docusaurus, MkDocs, OpenAPI UI)

---

## Build & Development Commands

### Installation & Setup
```bash
# Install dependencies
npm install

# First-time setup (for protocols)
cd src
npm install
```

### Development
```bash
# CLI development (watch mode if applicable)
node bin/dochealth.js [command]

# Dashboard development
cd dashboard
npm run dev

# Link CLI globally for testing
npm link
```

### Building
```bash
# Build CLI
npm run build

# Build dashboard
cd dashboard
npm run build

# Package for distribution
npm pack
```

### Testing
```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Generate coverage
npm run test:coverage
```

### Linting & Formatting
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking (if TypeScript added)
npm run type-check
```

---

## Project Structure & Navigation

### Directory Layout
```
DocHealth CLI & Dashboard/
├── bin/                           # CLI entry points
│   └── dochealth.js               # Main CLI executable
├── lib/                           # CLI core logic
│   ├── loader.js                  # Load protocol manifests
│   ├── analyzer.js                # Freshness, coverage checks
│   ├── generator.js               # Markdown generation
│   └── reporter.js                # Health score, action items
├── src/                           # Protocol implementations (existing)
│   ├── api_protocol_v_1_1_1.js
│   ├── data_protocol_v_1_1_1.js
│   ├── Documentation Protocol — v1.1.1.js
│   ├── workflow_protocol_v_1_1_1.js
│   ├── Semantic Protocol — v3.2.0.js
│   └── ...
├── dashboard/                     # Web dashboard (React/Vite)
│   ├── src/
│   ├── public/
│   └── package.json
├── tests/                         # Application tests
│   ├── unit/
│   └── integration/
├── docs/                          # Project documentation
│   ├── roadmap.md
│   └── technical_architecture.md
└── cmos/                          # Project management (DO NOT write code here!)
```

### Key Files
- `bin/dochealth.js` - CLI entry point and command router
- `lib/loader.js` - Protocol manifest loading and validation
- `lib/analyzer.js` - Core health analysis engine
- `lib/generator.js` - Documentation generation from protocols
- `src/` - Protocol implementations (already built, ~70% of infrastructure)

**Critical**: Never write application code in `cmos/` directory. That's for project management only.

---

## Coding Standards & Style

### JavaScript Guidelines
- Use modern ES6+ syntax (const/let, arrow functions, async/await)
- Prefer functional programming patterns where appropriate
- Use destructuring for cleaner code
- Follow consistent naming conventions:
  - camelCase for variables and functions
  - PascalCase for classes and constructors
  - UPPER_CASE for constants
- Max line length: 100 characters
- Use JSDoc comments for public functions

**Example**:
```javascript
/**
 * Analyzes protocol manifest for freshness issues
 * @param {Object} manifest - Protocol manifest object
 * @param {Object} options - Analysis options
 * @returns {Object} Analysis results with health score
 */
async function analyzeFreshness(manifest, options = {}) {
  const { lastCodeChange, lastDocUpdate } = extractTimestamps(manifest);
  return calculateFreshnessScore(lastCodeChange, lastDocUpdate);
}
```

### File Organization
- Group related functionality into modules
- One primary export per file
- Use index.js for clean imports where appropriate
- Keep modules focused and single-purpose

### Comments & Documentation
- Document all public APIs with JSDoc
- Use inline comments for complex logic only
- Keep comments up-to-date with code changes
- Document "why" not "what" in comments

---

## Testing Preferences

### Framework & Tools
- **Framework**: Node.js native test runner or Jest
- **Coverage target**: 80% minimum
- **Coverage tool**: c8 or Jest coverage

### Test Structure
- **Test location**: `tests/` directory (NOT in cmos/)
- **Test naming**: `*.test.js` or `test_*.js`
- **Test organization**: Mirror source structure in tests/

### Testing Requirements
- [ ] All protocol loader functions must have unit tests
- [ ] All analyzers must have integration tests
- [ ] CLI commands must have end-to-end tests
- [ ] Mock protocol manifests for consistent testing
- [ ] Run full suite before marking missions complete

**Example test**:
```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { analyzeFreshness } from '../lib/analyzer.js';

test('analyzeFreshness detects stale documentation', async () => {
  const manifest = {
    last_code_change_at: '2025-11-08',
    updated_at: '2025-10-01'
  };
  const result = await analyzeFreshness(manifest);
  assert.ok(result.isStale);
  assert.strictEqual(result.daysSinceUpdate, 38);
});
```

---

## Security & Quality Guardrails

### Security Rules
- Never commit API keys, tokens, or secrets
- Use environment variables for sensitive data (.env files)
- Validate all user inputs, especially file paths
- Sanitize any user-provided content before file operations
- Be cautious with eval() and dynamic code execution

### Code Quality Gates
- ESLint must pass before commits
- All tests must pass before merging
- Coverage must meet 80% threshold
- No console.log in production code (use proper logging)

### Forbidden Patterns
- ❌ Hardcoded credentials or API keys
- ❌ Unvalidated file system operations
- ❌ Direct eval() of user input
- ❌ Synchronous file operations in main execution paths (use async)

---

## Architecture Patterns

### Preferred Design Patterns
- **Factory Pattern**: Use for creating protocol instances (already implemented in src/)
- **Strategy Pattern**: For different output formats (Markdown, JSON, HTML)
- **Observer Pattern**: For health monitoring and event emission

**Example**:
```javascript
// Factory pattern for protocol creation
const ProtocolFactory = {
  createDocsProtocol: (config) => createDocsProtocol(config),
  createAPIProtocol: (config) => createAPICatalog(config),
  // ... other protocol factories
};
```

### CLI Design
- **Command Pattern**: Each CLI command is a separate module
- **Commander.js or similar**: For argument parsing and help text
- **Exit codes**: Use standard exit codes (0 = success, 1 = error, 2 = usage error)

### Dashboard Architecture (Future)
- **Component-based**: React functional components with hooks
- **State management**: Context API or lightweight state library
- **Data fetching**: Async loading with loading states
- **Visualization**: Chart.js or similar for health score trends

---

## Project-Specific Configuration

### Environment Variables
```bash
# Development
DOCHEALTH_CONFIG_PATH=./dochealth.config.js
DOCHEALTH_LOG_LEVEL=debug

# Production
DOCHEALTH_CONFIG_PATH=/etc/dochealth/config.js
DOCHEALTH_LOG_LEVEL=info
```

### Protocol Integration
- Load protocols from `src/` directory
- Each protocol is a self-contained module with validators
- Use URN-based linking between protocols
- Reuse existing protocol query languages and diff detection

### CLI Configuration
- Support `dochealth.config.js` for project-specific settings
- Allow command-line flags to override config
- Auto-detect protocol manifests in current directory

---

## CMOS Integration Notes

### When Working on Application Code
1. Read THIS agents.md (project-root/agents.md)
2. Write CLI code to `lib/`, `bin/`
3. Write dashboard code to `dashboard/src/`
4. Write tests to `tests/` directory
5. Protocol implementations live in `src/` (already built)
6. Never write application code to `cmos/`

### When Working on CMOS Operations
1. Read `cmos/agents.md` for CMOS-specific instructions
2. Use mission runtime scripts
3. Update missions and contexts in `cmos/`
4. Keep application code and CMOS management separate

### Before Completing Missions
- [ ] All application tests pass
- [ ] Code meets standards defined above
- [ ] Documentation updated if needed
- [ ] CLI commands tested manually
- [ ] Mission status verified in database

---

## Development Workflow

### Branch Strategy
- **Main**: Production-ready code
- **Development**: Integration branch
- **Features**: feature/feature-name

### Commit Messages
```
[type]([scope]): [description]

Examples:
feat(cli): add dochealth check command
feat(analyzer): implement freshness detection
feat(generator): add API reference generation
fix(loader): resolve protocol manifest parsing issue
docs(readme): update installation instructions
test(analyzer): add coverage analysis tests
```

---

## MVP Feature Set (Based on Viability Assessment)

### Phase 1: CLI Core (Current Focus)
**Goal**: Prove value with command-line health checks

| Feature | Description |
|---------|-------------|
| `dochealth check` | Load manifests, run validators, output health score |
| Freshness detection | Compare timestamps across protocols |
| Coverage analysis | Identify gaps in documentation |
| URN resolver | Validate cross-protocol links |
| CI/CD integration | Exit codes for broken builds; JSON output |

### Phase 2: Auto-Generation (Future)
- `dochealth generate api` - Auto-create Markdown API reference
- `dochealth generate data` - Auto-create data catalog docs
- `dochealth generate workflows` - Generate Mermaid DAGs
- Skeleton generator - Create doc outlines

### Phase 3: Dashboard & Monitoring (Future)
- Web dashboard with health score visualization
- Trend tracking over time
- Smart SME routing based on semantic criticality

---

## Notes for AI Agents

### Context Loading Priority
1. Load `project-root/agents.md` (THIS FILE) for application work
2. Load `cmos/agents.md` for CMOS operations
3. Load `cmos/PROJECT_CONTEXT.json` for current state
4. Load `cmos/context/MASTER_CONTEXT.json` for project history
5. Reference `cmos/SESSIONS.jsonl` for recent session history

### Output Standards
- Use Markdown for documentation
- Use JSON for structured output (CLI --json flag)
- Include code examples with JavaScript syntax highlighting
- Keep explanations concise but complete

### Communication Style
- Technical and precise
- Provide actionable recommendations
- Include examples when explaining concepts
- Ask clarifying questions when requirements are ambiguous

---

## Key Success Metrics

From the viability assessment, success is measured by:

1. **Freshness**: Automatic detection of stale docs (code changed but docs didn't)
2. **Coverage**: Identification of API endpoints/data fields without docs
3. **URN Validation**: All cross-protocol links resolve correctly
4. **Health Score**: 0-100 score based on freshness, coverage, and completeness
5. **CI/CD Integration**: Reliable exit codes and JSON output for automation

---

**Last Updated**: 2025-11-08
**Status**: Ready for Phase 1 implementation (CLI Core)
**Next**: Build CLI scaffold and implement `dochealth check` command
