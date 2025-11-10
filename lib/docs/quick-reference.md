# Protocol API Quick Reference

Quick reference guide for implementing DocHealth CLI and working with protocol APIs.

## Protocol Factory Functions

### Single Protocol Creation
```javascript
createAPIProtocol(manifest)      // API endpoints & client SDKs
createDataProtocol(manifest)     // Dataset schemas & governance
createDocsProtocol(manifest)     // Documentation & freshness
createWorkflowProtocol(manifest) // Workflow DAGs & agents
createSemanticProtocol(manifest) // Semantic analysis
createAgentProtocol(manifest)    // AI agents & delegation
createEventProtocol(manifest)    // Events & compatibility
createUIProtocol(manifest)       // UI components
createIdentityProtocol(manifest) // IAM & access control
```

### Catalog Creation
```javascript
createAPICatalog([protocols])      // API collections
createDataCatalog([protocols])     // Data collections
createDocsCatalog([protocols])     // Doc collections
createWorkflowCatalog([protocols]) // Workflow collections
createSemanticCatalog([protocols]) // Semantic collections
createAgentCatalog([protocols])    // Agent collections
createEventCatalog([protocols])    // Event collections
createUICatalog([protocols])       // UI collections
createIdentityCatalog([protocols]) // Identity collections
```

## Core Instance Methods

All protocol instances support:

```javascript
protocol.manifest()                    // Get manifest copy
protocol.validate([names])            // Run validators
protocol.match(expression)            // Query protocol
protocol.diff(otherProtocol)          // Compare protocols
protocol.set(path, value)             // Create updated copy
```

## Query Language

### Operators
```javascript
'path:=:value'        // Exact match
'path:contains:value' // Substring match
'path:>:value'        // Greater than
'path:<:value'        // Less than
'path:>=:value'       // Greater or equal
'path:<=:value'       // Less or equal
```

### Common Queries
```javascript
// API
'service.name:contains:billing'
'interface.endpoints.0.method:=:GET'
'operations.rate_limits[0].limit:>:1000'

// Data
'dataset.name:contains:user'
'schema.fields:contains:email'
'governance.policy.classification:=:pii'

// Documentation
'structure.navigation:contains:API'
'links.targets:contains:urn:proto:api'
'maintenance.freshness_check.enabled:=:true'

// Workflow
'steps:contains:human'
'sla.timeout:>:30s'
'workflow.id:=:order-fulfillment'

// Semantic
'element.criticality:>:0.7'
'context.domain:contains:finance'
'governance.piiHandling:=:true'

// Agent
'capabilities.tools:contains:search'
'relationships.apis:contains:urn:proto:api'
'agent.lifecycle.status:=:enabled'

// Event
'event.name:contains:payment'
'schema.pii:contains:email'
'delivery.contract.guarantees:=:at-least-once'

// UI
'behavior.states:contains:loading'
'component.type:=:atom'
'data.props:contains:disabled'

// Identity
'authz.roles:contains:admin'
'authz.permissions:contains:pii:read'
'identity.type:=:human'
```

## Common Validators

### Run All Validators
```javascript
protocol.validate()
// Returns: { ok: boolean, results: [{ name, ok, issues[] }] }
```

### Run Specific Validators
```javascript
protocol.validate(['core.shape', 'governance.pii_policy'])
```

### Built-in Validators by Protocol

**All Protocols:**
- `core.shape` - Basic structure
- `lifecycle` - Status validation
- `governance.pii_policy` - PII protection
- `signature.envelope` - Signature validation

**API:**
- `errors.minimal` - Error definitions
- `ops.rates` - Rate limits

**Data:**
- `schema.keys` - Primary/foreign keys
- `operations.refresh` - Refresh schedules

**Documentation:**
- `links.urns` - URN format
- `quality.health` - Coverage metrics
- `maintenance.freshness` - Freshness config

**Workflow:**
- `deps.acyclic` - Cycle detection
- `sla.consistency` - SLA format
- `human.safety` - Human task safety
- `compensation.hint` - Side effects
- `nodes.agent` - Agent validation

**Agent:**
- `capabilities.tools_unique` - Unique tools
- `communication.shape` - Communication config
- `authorization.delegation_min` - Delegation
- `relationships.urns` - Relationship URNs

**Event:**
- `governance.pii_policy` - PII classification
- `delivery.contract` - Delivery guarantees

**UI:**
- `props.unique_types` - Property validation
- `fetching.consistency` - State consistency
- `flows.referential` - Flow validation
- `a11y.basic` - Accessibility

**Identity:**
- `authn.factors` - Authentication factors
- `authz.roles_permissions` - RBAC validation
- `delegation.core` - Delegation structure

## Generator Functions

### API Protocol
```javascript
protocol.generateTests()                    // HTTP test skeletons
protocol.generateClientSDK({moduleName})   // Fetch-based client
```

### Data Protocol
```javascript
protocol.generateMigration(other)          // Schema migration steps
protocol.generateSchema()                  // JSON Schema
protocol.generateValidation()              // Validation function
protocol.generateDocs()                    // Documentation table
```

### Documentation Protocol
```javascript
protocol.generateDocsSkeleton()            // Markdown docs
protocol.generateMermaidNav()              // Mermaid graph
protocol.generateProtocolStubs(registry)   // URN stubs
protocol.findOutdated(days)               // Stale sections
protocol.analyzeCoverage()                // Coverage metrics
```

### Workflow Protocol
```javascript
protocol.generateWorkflowEngine()          // Executable code
protocol.generateVisualDAG()               // Mermaid DAG
protocol.generateAgentNodeStub(node, manifest) // Agent code
protocol.generateTestSuite()               // Test suite
protocol.generateDocs()                    // Documentation
protocol.generateConfig()                  // Configuration
```

### Semantic Protocol
```javascript
protocol.generateDocs()                    // Semantic docs
```

### Agent Protocol
```javascript
protocol.generateAgentCard()               // Agent Card JSON
protocol.generateDocs()                    // Agent docs
protocol.generateTest(framework)          // Test skeleton
```

### Event Protocol
```javascript
protocol.generateConsumerSkeleton(lang)    // Consumer code
protocol.generateTestScenarios()          // Test scenarios
protocol.checkCompatibility(consumer)     // Version check
```

### UI Protocol
```javascript
protocol.generateComponent({framework})   // React component
protocol.generateStorybook()              // Storybook stories
protocol.generateCypressTest()            // Cypress tests
protocol.generateDocs()                   // Component docs
protocol.generateTestSuite()              // Test suite
protocol.generateConfig()                 // Configuration
```

### Identity Protocol
```javascript
protocol.generatePolicy({style})          // Policy document
protocol.generateVisualMap()              // Mermaid IAM graph
protocol.generateAuditTests(perms)       // Permission tests
protocol.crossValidateWithAPI(api)       // API validation
protocol.crossValidateWithData(data)     // Data validation
protocol.crossValidateWithWorkflow(wf)   // Workflow validation
```

## Diff and Change Detection

```javascript
const diff = protocol1.diff(protocol2);
// Returns: {
//   changes: [{path, from, to}],
//   breaking: [{path, from, to, reason}],
//   significant: [{path, from, to, reason}]
// }
```

### Breaking Change Examples
```javascript
// API: Auth type change, endpoint signature change
// Data: Primary key change, column drop, type change
// Docs: Section removal, navigation change
// Workflow: Step type change, service change
// Semantic: Intent change, binding change
// Agent: Identity change, authorization change
// Event: Schema change, guarantee change
// UI: Props signature change
// Identity: Permission removal, lifecycle downgrade
```

## Utility Functions

```javascript
// Deep get/set
dget(obj, 'path.to.value')
dset(obj, 'path.to.value', newValue)

// JSON canonicalization
jsonCanon(value) // Stable JSON string

// Hashing (FNV-1a 64-bit)
hash(value) // Returns 'fnv1a64-...'

// Deep clone
clone(value)

// URN validation
isURN(string) // Returns boolean
```

## Delegation (Identity Protocol)

```javascript
// Create delegation
createDelegationManifest(
  delegatorUrn,
  delegateUrn,
  scopes[],
  maxDepth, // 1-5
  { expiresAt, constraints }
)

// Validate chain
validateDelegationChain(parent, child)
// Returns: { ok: boolean, issues: [...] }

// Check expiration
isDelegationExpired(delegation)
```

## Cross-Protocol Validation

```javascript
// Identity + API
identity.crossValidateWithAPI(apiManifest, scopeToPerm)

// Identity + Data
identity.crossValidateWithData(dataManifest, mapping)

// Identity + Workflow
identity.crossValidateWithWorkflow(workflowManifest, roleSelector)
```

## Quick Command Reference

```bash
# Load protocol
const protocol = createXProtocol(manifest);

# Validate
protocol.validate()

# Query
protocol.match('property:contains:value')

# Diff
protocol.diff(otherProtocol)

# Generate
protocol.generateDocs()
protocol.generateTests()

# Catalog operations
catalog.find('query')
catalog.validateAll()
```

## Error Handling

```javascript
// Validation result
{
  ok: false,
  results: [{
    name: 'validator',
    ok: false,
    issues: [{
      path: 'field.path',
      msg: 'Error message',
      level: 'error' | 'warn'
    }]
  }]
}

// Diff result
{
  changes: [...],      // All changes
  breaking: [...],     // Breaking changes
  significant: [...]   // Important changes
}
```

## File Locations

```
src/
├── api_protocol_v_1_1_1.js              # API Protocol
├── data_protocol_v_1_1_1.js             # Data Protocol
├── Documentation Protocol — v1.1.1.js   # Documentation Protocol
├── workflow_protocol_v_1_1_1.js         # Workflow Protocol
├── Semantic Protocol — v3.2.0.js        # Semantic Protocol
├── agent_protocol_v_1_1_1.js            # Agent Protocol
├── event_protocol_v_1_1_1.js            # Event Protocol
├── ui_component_protocol_v_1_1_1.js     # UI Protocol
└── Identity & Access Protocol — v1.1.1.js # Identity Protocol

lib/docs/
├── protocol-api-reference.md            # Complete API reference
├── factory-function-inventory.md        # Factory examples
└── validator-catalog.md                 # Validator details
```

This quick reference provides the essential information needed to work with protocol APIs. For detailed documentation, see the complete API reference guides.