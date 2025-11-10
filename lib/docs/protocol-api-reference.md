# Protocol API Reference Guide

This document provides a comprehensive reference for all 9 protocol implementations in the DocHealth system. It documents common patterns, factory functions, validators, and usage examples.

## Protocol Overview

The DocHealth system includes 9 protocol implementations, each following consistent patterns:

- **API Protocol** (`api_protocol_v_1_1_1.js`) - API endpoint definitions and client SDK generation
- **Data Protocol** (`data_protocol_v_1_1_1.js`) - Dataset schemas and governance
- **Documentation Protocol** (`Documentation Protocol — v1.1.1.js`) - Documentation structure and freshness
- **Workflow Protocol** (`workflow_protocol_v_1_1_1.js`) - Workflow DAGs and agent orchestration
- **Semantic Protocol** (`Semantic Protocol — v3.2.0.js`) - Semantic analysis and criticality scoring
- **Agent Protocol** (`agent_protocol_v_1_1_1.js`) - AI agent capabilities and delegation
- **Event Protocol** (`event_protocol_v_1_1_1.js`) - Event schemas and compatibility
- **UI Component Protocol** (`ui_component_protocol_v_1_1_1.js`) - UI component definitions
- **Identity & Access Protocol** (`Identity & Access Protocol — v1.1.1.js`) - IAM and delegation

## Common Architecture Patterns

### 1. Factory Functions

Every protocol provides two factory functions:

#### Single Protocol Factory
```javascript
createXProtocol(manifestInput = {})
```
- **Parameters**: `manifestInput` - Object containing protocol-specific manifest data
- **Returns**: Frozen protocol instance with core methods
- **Example**:
```javascript
const apiProtocol = createAPIProtocol({
  service: { name: 'billing', version: '1.2.0' },
  interface: { endpoints: [...] }
});
```

#### Catalog Factory
```javascript
createXCatalog(protocols = [])
```
- **Parameters**: `protocols` - Array of protocol instances
- **Returns**: Catalog with search and validation capabilities
- **Example**:
```javascript
const catalog = createAPICatalog([api1, api2, api3]);
const billingAPIs = catalog.find('service.name:contains:billing');
```

### 2. Core Instance Methods

All protocol instances provide these methods:

#### `.manifest()`
Returns a cloned copy of the normalized manifest.
```javascript
const manifest = protocol.manifest();
```

#### `.validate(names = [])`
Runs validators on the manifest.
```javascript
const result = protocol.validate(); // All validators
const result = protocol.validate(['core.shape', 'ops.rates']); // Specific validators
// Returns: { ok: boolean, results: [{ name, ok, issues[] }] }
```

#### `.match(expr)` / `.query(expr)`
Queries the manifest using the protocol query language.
```javascript
const matches = protocol.match('service.name:contains:billing');
const matches = protocol.query('interface.endpoints.0.method:=:GET');
```

#### `.diff(other)`
Computes differences between two manifests.
```javascript
const changes = protocol1.diff(protocol2);
// Returns: { changes[], breaking[], significant[] }
```

#### `.set(path, value)`
Creates a new protocol instance with updated value.
```javascript
const newProtocol = protocol.set('service.version', '2.0.0');
```

### 3. Validator System

#### Validator Registry
Each protocol maintains a `Validators` Map and provides:

```javascript
registerValidator(name, validationFunction)
```

#### Built-in Validators (Common Across Protocols)

**`core.shape`** - Basic structure validation
- Validates required fields exist
- Checks data types and array requirements
- Protocol-specific required fields

**`lifecycle`** - Lifecycle status validation
- Validates status values (ga|beta|deprecated, active|deprecated, etc.)
- Checks sunset dates when applicable

**`governance.pii_policy`** - PII governance validation
- Ensures PII fields have proper classification
- Validates encryption requirements
- Checks data residency policies

**`signature.envelope`** - Signature validation
- Validates signature envelope structure
- Checks algorithm compliance
- Verifies required fields

#### Protocol-Specific Validators

**API Protocol**:
- `errors.minimal` - Error code validation
- `ops.rates` - Rate limit configuration validation

**Data Protocol**:
- `schema.keys` - Primary key and foreign key validation
- `operations.refresh` - Refresh schedule validation

**Documentation Protocol**:
- `links.urns` - URN format validation for cross-protocol links
- `quality.health` - Documentation coverage validation
- `maintenance.freshness` - Freshness check configuration validation

**Workflow Protocol**:
- `deps.acyclic` - Dependency cycle detection
- `sla.consistency` - SLA timeout format validation
- `human.safety` - Human task outcome validation
- `compensation.hint` - Side effect compensation warnings
- `nodes.agent` - Agent step validation

**Agent Protocol**:
- `capabilities.tools_unique` - Unique tool name validation
- `communication.shape` - Communication protocol validation
- `authorization.delegation_min` - Delegation requirements
- `relationships.urns` - Cross-protocol URN validation

**Event Protocol**:
- `governance.pii_policy` - PII field classification
- `delivery.contract` - Delivery guarantee validation

**UI Component Protocol**:
- `props.unique_types` - Unique property names and valid types
- `fetching.consistency` - Data fetching state consistency
- `flows.referential` - User flow outcome validation
- `a11y.basic` - Accessibility property validation

**Identity & Access Protocol**:
- `authn.factors` - Authentication factor requirements
- `authz.roles_permissions` - Role permission mapping and acyclicity
- `delegation.core` - Delegation manifest validation

### 4. Query Language

All protocols support a consistent query language with these operators:

#### Operators
- `:=:` - Exact string match
- `contains` - Substring match
- `>` - Greater than (numeric)
- `<` - Less than (numeric)
- `>=` - Greater than or equal (numeric)
- `<=` - Less than or equal (numeric)

#### Query Syntax
```
path:operator:value
```

#### Examples
```javascript
// API Protocol
'interface.endpoints.0.method:=:GET'
'service.name:contains:billing'
'operations.rate_limits[0].limit:>:1000'

// Data Protocol
'dataset.name:contains:user'
'schema.fields:contains:email'
'quality.row_count_estimate:>:100000'

// Documentation Protocol
'structure.navigation:contains:API'
'links.targets:contains:urn:proto:api'

// Workflow Protocol
'steps:contains:human'
'sla.timeout:>:30s'

// Semantic Protocol
'element.criticality:>:0.7'
'context.domain:contains:ai'

// Agent Protocol
'capabilities.tools:contains:search'
'relationships.apis:contains:urn:proto:api'

// Event Protocol
'event.name:contains:payment'
'schema.pii:contains:email'

// UI Component Protocol
'behavior.states:contains:loading'
'data.props:contains:disabled'

// Identity Protocol
'authz.roles:contains:admin'
'authz.permissions:contains:pii:read'
```

### 5. Utility Functions

#### Shared Utilities (All Protocols)
```javascript
// Deep get/set
dget(obj, 'path.to.value')
dset(obj, 'path.to.value', newValue)

// JSON canonicalization for stable hashing
jsonCanon(value)

// Stable hashing (FNV-1a 64-bit)
hash(value) // Returns 'fnv1a64-...'

// Deep clone
clone(value)

// URN validation
isURN(string) // Returns boolean
```

### 6. Diff and Change Detection

All protocols implement structural diff with breaking change detection:

```javascript
const diffResult = protocol1.diff(protocol2);
// Returns:
{
  changes: [{ path, from, to }],      // All changes
  breaking: [{ path, from, to, reason }], // Breaking changes
  significant: [{ path, from, to, reason }] // Important non-breaking changes
}
```

#### Breaking Change Heuristics
- **API**: Auth type changes, endpoint signature changes, schema changes, lifecycle downgrade
- **Data**: Primary key changes, column type changes, column drops, required flag changes, PII flag changes
- **Docs**: Section changes, navigation changes, linked targets changes, governance changes
- **Workflow**: Step signature changes, step type changes, service changes, SLA changes
- **Semantic**: Intent changes, protocol bindings changes
- **Agent**: Identity changes, authorization changes
- **Event**: Schema changes, delivery guarantee changes, lifecycle downgrade
- **UI**: Props signature changes
- **Identity**: Lifecycle downgrade, permission removal, authentication factor reduction

### 7. Generator Functions

Each protocol provides specialized generators:

#### API Protocol
```javascript
.generateTests() // Generate HTTP test skeletons
.generateClientSDK({ moduleName: 'BillingClient' }) // Generate fetch-based client
```

#### Data Protocol
```javascript
.generateMigration(otherManifest) // Generate schema migration steps
.generateSchema() // Generate JSON Schema
.generateValidation() // Generate validation function
.generateDocs() // Generate documentation table
```

#### Documentation Protocol
```javascript
.generateDocsSkeleton() // Generate markdown documentation
.generateMermaidNav() // Generate Mermaid navigation graph
.generateProtocolStubs(registry) // Generate stubs from URNs
.findOutdated(daysThreshold) // Find outdated sections
.analyzeCoverage() // Calculate documentation coverage
```

#### Workflow Protocol
```javascript
.generateWorkflowEngine() // Generate executable workflow code
.generateVisualDAG() // Generate Mermaid DAG
.generateAgentNodeStub(nodeId, agentManifest) // Generate agent execution stub
.generateTestSuite() // Generate test suite
.generateDocs() // Generate workflow documentation
.generateConfig() // Generate configuration
```

#### Semantic Protocol
```javascript
.generateDocs() // Generate semantic documentation
```

#### Agent Protocol
```javascript
.generateAgentCard() // Generate Agent Card JSON
.generateDocs() // Generate agent documentation
.generateTest(framework) // Generate test skeleton (jest|cypress)
```

#### Event Protocol
```javascript
.generateConsumerSkeleton(language) // Generate consumer code
.generateTestScenarios() // Generate test scenarios
.checkCompatibility(consumer) // Check version compatibility
```

#### UI Component Protocol
```javascript
.generateComponent({ framework }) // Generate React component
.generateStorybook() // Generate Storybook stories
.generateCypressTest() // Generate Cypress tests
.generateDocs() // Generate component documentation
.generateTestSuite() // Generate test suite
.generateConfig() // Generate configuration
```

#### Identity & Access Protocol
```javascript
.generatePolicy({ style }) // Generate policy document
.generateVisualMap() // Generate Mermaid IAM graph
.generateAuditTests(requiredPerms) // Generate permission tests
.crossValidateWithAPI(apiManifest) // Cross-validate with API
.crossValidateWithData(dataManifest) // Cross-validate with Data
.crossValidateWithWorkflow(workflowManifest) // Cross-validate with Workflow
```

## Protocol-Specific Manifest Structures

### API Protocol Manifest
```javascript
{
  version: "v1.1.1",
  service: { name, version },
  capabilities: { ... },
  interface: {
    authentication: { type, in, scopes },
    endpoints: [{ method, path, summary, params, request, responses, errors, pagination, long_running }]
  },
  operations: { rate_limits: [{ scope, limit, window, burst }] },
  context: { ... },
  validation: { schemas, schema_hashes },
  quality: { ... },
  metadata: { lifecycle: { status, sunset_at } },
  relationships: { dependencies, consumers, complements },
  rules: { ... },
  sig: { ... }
}
```

### Data Protocol Manifest
```javascript
{
  version: "v1.1.1",
  dataset: { name, type, lifecycle },
  schema: {
    primary_key,
    fields: { fieldName: { type, required, pii, description } },
    keys: { unique, foreign_keys, partition }
  },
  lineage: { sources: [{ type, id }], consumers: [{ type, id }] },
  operations: { refresh: { schedule, expected_by }, retention },
  governance: {
    policy: { classification, legal_basis },
    storage_residency: { region, vendor, encrypted_at_rest }
  },
  quality: { freshness_ts, row_count_estimate, null_rate },
  catalog: { owner, tags },
  sig: { ... }
}
```

### Documentation Protocol Manifest
```javascript
{
  documentation: { id, title, format, lifecycle },
  links: { targets: [URNs] },
  structure: {
    navigation: [{ id, title, href, audience, children }],
    sections: [{ id, title, body, audience, anchors }]
  },
  content: {
    examples: { interactive_config: { provider, source_files } },
    pages: { slug: { title, body } }
  },
  quality: {
    docs_health: { coverage, missing_sections },
    feedback_summary: { page_ratings, unhelpful_votes }
  },
  maintenance: {
    freshness_check: { enabled, source_code_path, last_code_change_at }
  },
  governance: { policy: { classification, review_cycle_days } },
  metadata: { owner, tags },
  sig: { ... }
}
```

### Workflow Protocol Manifest
```javascript
{
  workflow: { id, name, purpose, migration_strategy },
  sla: { timeout, on_timeout_event },
  steps: [{
    id,
    type: 'service'|'human'|'event'|'agent',
    service, // for service type
    agent: { urn, discoveryUri, tools, resources, prompts, timeout, protocol, delegation },
    inputs: { name: value|{from, expression} },
    dependencies: [stepIds],
    human_task: { role, form_schema, outcomes },
    retry: { retries, backoff },
    idempotency_key,
    side_effects,
    governance: { classification }
  }],
  metadata: { owner, tags }
}
```

### Semantic Protocol Manifest
```javascript
{
  version: "3.2.0",
  urn: "urn:proto:semantic:component@3.2.0",
  element: { type, role, intent, criticality },
  semantics: {
    purpose,
    precision: { confidence },
    features: { vector: [64 floats] }
  },
  context: {
    domain, flow, step,
    protocolBindings: {
      api: [{ urn, purpose, requires, provides }],
      event: [...],
      workflow: [...],
      data: [...]
    }
  },
  governance: { piiHandling, businessImpact, userVisibility, owner },
  relationships: { dependents: [URNs] },
  metadata: { description, tags },
  __sig: { hash, shape }
}
```

### Agent Protocol Manifest
```javascript
{
  version: "v1.1.1",
  agent: {
    id, name, version,
    discovery_uri,
    lifecycle: { status: 'defined'|'enabled'|'paused'|'deprecated' }
  },
  capabilities: {
    tools: [{ name, description, inputSchema, outputSchema, urn }],
    resources: [{ uri, name, mimeType, urn }],
    prompts: [{ name, description, arguments, urn }],
    modalities: { input: [], output: [] }
  },
  communication: {
    supported: ['a2a'|'mcp'|'custom'],
    endpoints: { ... },
    transport: { primary: 'https'|'stdio'|'grpc'|'ws', streaming: 'sse'|'ws'|'none', fallback: 'polling'|'none' }
  },
  authorization: {
    delegation_supported: boolean,
    signature_algorithm: 'ES256'|'Ed25519'|'RS256'
  },
  relationships: {
    models: [URNs],
    apis: [URNs],
    workflows: [URNs],
    roles: [URNs],
    targets: [URNs]
  },
  metadata: { owner, tags }
}
```

### Event Protocol Manifest
```javascript
{
  version: "v1.1.1",
  event: { name, version, lifecycle },
  semantics: { purpose },
  schema: {
    format: 'json-schema'|'custom',
    payload: { JSON Schema },
    fields: [{ name, type, required, pii, description }],
    compatibility: { policy: 'backward'|'forward'|'full'|'none', compatible_versions: [] }
  },
  delivery: {
    contract: {
      transport: 'kafka'|'sns'|'sqs'|'webhook'|'sse'|'ws',
      topic,
      guarantees: 'at-least-once'|'exactly-once'|'best-effort',
      retry_policy: 'exponential'|'linear'|'none',
      dlq
    }
  },
  governance: { policy: { classification, legal_basis } },
  metadata: { owner, tags },
  sig: { ... }
}
```

### UI Component Protocol Manifest
```javascript
{
  component: { id, name, type: 'atom'|'molecule'|'organism'|'template'|'page', framework: 'react'|'vue'|'svelte'|'web', version },
  design: { figma_url, tokens: {} },
  data: {
    props: [{ name, type, required, default, description, options }],
    fetching: { endpoint, on_loading_state, on_success_state, on_error_state }
  },
  behavior: {
    states: { stateName: { description, associated_props: [] } },
    user_flows: [{ name, steps: [{ interaction, target, outcome }] }]
  },
  a11y: {
    contract: { role, label_prop, describedby_prop, keyboard_support: [] }
  },
  metadata: { owner, tags }
}
```

### Identity & Access Protocol Manifest
```javascript
{
  identity: {
    id,
    type: 'human'|'service'|'device',
    lifecycle: { status: 'active'|'suspended'|'revoked'|'expired', sunset_at }
  },
  profile: { email, name, dept },
  authn: {
    factors: [{ factor: 'password'|'otp'|'key'|'federated', required, meta }],
    federation: { provider: 'saml'|'oidc', issuer, client_id }
  },
  authz: {
    roles: [],
    permissions: { roleName: ['perm:string'] },
    roles_graph: { inherits: { roleName: [parentRoles] } }
  },
  policies: {
    governance: { classification, rotation_days },
    authn: { mfa_required, min_factors }
  },
  relationships: { groups: [], trusts: [] },
  metadata: { owner, tags },
  sig: { ... }
}
```

## Usage Examples

### Loading and Validating Protocols
```javascript
import { createAPIProtocol, createAPICatalog } from './src/api_protocol_v_1_1_1.js';

// Create a protocol instance
const api = createAPIProtocol(manifest);

// Validate
const validation = api.validate();
if (!validation.ok) {
  console.error('Validation failed:', validation.results);
}

// Query
const getEndpoints = api.match('interface.endpoints.0.method:=:GET');

// Diff
const api2 = api.set('service.version', '2.0.0');
const changes = api.diff(api2);
```

### Working with Catalogs
```javascript
import { createDataCatalog } from './src/data_protocol_v_1_1_1.js';

const catalog = createDataCatalog([data1, data2, data3]);

// Find protocols
const piiDatasets = catalog.find('governance.policy.classification:=:pii');

// Validate all
const results = catalog.validateAll();

// Protocol-specific catalog methods
const cycles = catalog.detectCycles();
const warnings = catalog.piiEgressWarnings();
```

### Cross-Protocol Validation
```javascript
import { createIdentityProtocol } from './src/Identity & Access Protocol — v1.1.1.js';

const identity = createIdentityProtocol(iamManifest);

// Cross-validate with API
const apiValidation = identity.crossValidateWithAPI(apiManifest);

// Cross-validate with Data
const dataValidation = identity.crossValidateWithData(dataManifest);

// Cross-validate with Workflow
const workflowValidation = identity.crossValidateWithWorkflow(workflowManifest);
```

### Generating Documentation
```javascript
// From Documentation Protocol
const docs = docsProtocol.generateDocsSkeleton();

// From Data Protocol
const schemaDocs = dataProtocol.generateDocs();

// From Workflow Protocol
const workflowDocs = workflowProtocol.generateDocs();

// From Agent Protocol
const agentDocs = agentProtocol.generateDocs();
```

### Freshness and Health Analysis
```javascript
// Documentation Protocol
const outdated = docsProtocol.findOutdated(30); // 30 days threshold
const coverage = docsProtocol.analyzeCoverage();

// Data Protocol
const migration = dataProtocol.generateMigration(newerVersion);
```

## Implementation Notes

### Module Exports
All protocols use consistent export patterns:
```javascript
// ESM
export { createXProtocol, createXCatalog, registerValidator, Validators };

// CommonJS (for Node.js)
if (typeof module !== 'undefined') {
  module.exports = { createXProtocol, createXCatalog, ... };
}
```

### Error Handling
- Validators return `{ ok: boolean, issues: [{ path, msg, level: 'error'|'warn' }] }`
- Factory functions throw on critical validation errors
- Diff functions always return a result object (never throw)

### Performance Considerations
- Manifests are normalized once during creation
- Hashing uses efficient FNV-1a algorithm
- Catalog operations are O(n) for find/validate
- Diff operations use structural comparison with early exit

### Security Features
- Signature envelope validation
- URN format validation
- Delegation chain depth limits (max 5)
- PII classification enforcement
- Permission inheritance cycle detection

This reference guide provides the foundation for implementing the DocHealth CLI tool. All protocols follow these consistent patterns, making it straightforward to build generic tooling that works across all protocol types.