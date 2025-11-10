# Factory Function Inventory & Examples

This document provides a complete inventory of all factory functions across the 9 protocols with practical usage examples.

## Factory Function Overview

Each protocol provides two factory functions:
1. **Single Protocol Factory**: Creates an individual protocol instance
2. **Catalog Factory**: Creates a collection of protocols for batch operations

## 1. API Protocol Factories

### `createAPIProtocol(manifestInput = {})`

Creates an API protocol instance for defining and validating API endpoints.

**Parameters:**
- `manifestInput` (Object): API manifest data

**Returns:** Frozen protocol instance with methods: `manifest()`, `validate()`, `match()`, `diff()`, `set()`, `generateTests()`, `generateClientSDK()`

**Example:**
```javascript
import { createAPIProtocol } from '../src/api_protocol_v_1_1_1.js';

const billingAPI = createAPIProtocol({
  version: "v1.1.1",
  service: {
    name: 'billing',
    version: '1.2.0'
  },
  interface: {
    authentication: {
      type: 'oauth2',
      scopes: ['read:invoices', 'write:invoices']
    },
    endpoints: [
      {
        method: 'GET',
        path: '/v1/invoices',
        summary: 'List invoices',
        params: [
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } }
        ],
        request: {
          contentType: 'application/json'
        },
        responses: [
          { status: 200, schema: { type: 'array' } }
        ],
        errors: [
          { code: 'RATE_LIMITED', http: 429, retriable: true }
        ],
        pagination: {
          style: 'cursor',
          params: { cursor: 'cursor', limit: 'limit' }
        }
      },
      {
        method: 'POST',
        path: '/v1/invoices',
        summary: 'Create invoice',
        request: {
          contentType: 'application/json',
          schema: {
            type: 'object',
            required: ['amount', 'customer_id'],
            properties: {
              amount: { type: 'number' },
              customer_id: { type: 'string' }
            }
          }
        },
        responses: [
          { status: 201, schema: { type: 'object' } }
        ]
      }
    ]
  },
  operations: {
    rate_limits: [
      { scope: 'user', limit: 1000, window: '1m', burst: 50 }
    ]
  },
  metadata: {
    lifecycle: { status: 'ga' }
  }
});

// Use the protocol
const manifest = billingAPI.manifest();
const validation = billingAPI.validate();
const tests = billingAPI.generateTests();
const sdk = billingAPI.generateClientSDK({ moduleName: 'BillingClient' });
```

### `createAPICatalog(protocols = [])`

Creates a catalog of API protocols for batch operations.

**Parameters:**
- `protocols` (Array): Array of API protocol instances

**Returns:** Catalog with methods: `items`, `find()`, `validateAll()`, `asManifests()`

**Example:**
```javascript
import { createAPICatalog } from '../src/api_protocol_v_1_1_1.js';

const catalog = createAPICatalog([
  billingAPI,
  paymentAPI,
  customerAPI
]);

// Find APIs by query
const billingAPIs = catalog.find('service.name:contains:billing');
const getEndpoints = catalog.find('interface.endpoints.0.method:=:GET');

// Validate all APIs
const validationResults = catalog.validateAll();

// Get all manifests
const manifests = catalog.asManifests();
```

## 2. Data Protocol Factories

### `createDataProtocol(manifestInput = {})`

Creates a data protocol instance for dataset definitions.

**Example:**
```javascript
import { createDataProtocol } from '../src/data_protocol_v_1_1_1.js';

const userEvents = createDataProtocol({
  version: "v1.1.1",
  dataset: {
    name: 'user_events',
    type: 'fact-table',
    lifecycle: { status: 'active' }
  },
  schema: {
    primary_key: 'event_id',
    fields: {
      event_id: { type: 'string', required: true, description: 'Unique event identifier' },
      user_id: { type: 'string', required: true, description: 'User identifier' },
      email: { type: 'string', pii: true, description: 'User email (PII)' },
      amount: { type: 'number', description: 'Transaction amount' },
      event_date: { type: 'date', required: true, description: 'Event timestamp' }
    },
    keys: {
      unique: ['event_id'],
      foreign_keys: [
        { field: 'user_id', ref: 'dim:users.id' }
      ],
      partition: { field: 'event_date', type: 'daily' }
    }
  },
  lineage: {
    sources: [{ type: 'service', id: 'user-service' }],
    consumers: [
      { type: 'model', id: 'churn-ml' },
      { type: 'external', id: 'vendor-x' }
    ]
  },
  operations: {
    refresh: { schedule: 'hourly', expected_by: '08:00Z' },
    retention: '2-years'
  },
  governance: {
    policy: { classification: 'pii', legal_basis: 'gdpr' },
    storage_residency: { region: 'eu', vendor: 's3', encrypted_at_rest: true }
  },
  quality: {
    freshness_ts: '2025-09-28T08:15:00Z',
    row_count_estimate: 123456,
    null_rate: { email: 0.02 }
  },
  catalog: {
    owner: 'identity-team',
    tags: ['events', 'pii']
  }
});

// Generate documentation
const docs = userEvents.generateDocs();
const schema = userEvents.generateSchema();
const validationFn = userEvents.generateValidation();

// Detect changes
const updated = userEvents.set('schema.fields.country', { type: 'string' });
const migration = userEvents.generateMigration(updated.manifest());
```

### `createDataCatalog(protocols = [])`

**Example:**
```javascript
import { createDataCatalog } from '../src/data_protocol_v_1_1_1.js';

const catalog = createDataCatalog([userEvents, userDim, productDim]);

// Find datasets
const piiDatasets = catalog.find('governance.policy.classification:=:pii');
const factTables = catalog.find('dataset.type:=:fact-table');

// Detect lineage cycles
const cycles = catalog.detectCycles();

// Check PII egress
const warnings = catalog.piiEgressWarnings();

// Validate all
const results = catalog.validateAll();
```

## 3. Documentation Protocol Factories

### `createDocsProtocol(manifestInput = {})`

Creates documentation protocol instances for tracking doc health and freshness.

**Example:**
```javascript
import { createDocsProtocol } from '../src/Documentation Protocol — v1.1.1.js';

const apiDocs = createDocsProtocol({
  documentation: {
    id: 'api-reference',
    title: 'API Reference Documentation',
    format: 'md',
    lifecycle: { status: 'published', updated_at: '2025-11-08' }
  },
  links: {
    targets: [
      'urn:proto:api:billing@1.1.1',
      'urn:proto:api:payments@1.1.1'
    ]
  },
  structure: {
    navigation: [
      {
        id: 'getting-started',
        title: 'Getting Started',
        href: '#getting-started',
        children: [
          { id: 'authentication', title: 'Authentication', href: '#auth' },
          { id: 'quickstart', title: 'Quick Start', href: '#quickstart' }
        ]
      },
      {
        id: 'endpoints',
        title: 'Endpoints',
        href: '#endpoints',
        children: [
          { id: 'invoices', title: 'Invoices', href: '#invoices' },
          { id: 'payments', title: 'Payments', href: '#payments' }
        ]
      }
    ],
    sections: [
      {
        id: 'getting-started',
        title: 'Getting Started',
        body: 'This API provides programmatic access to billing services...'
      },
      {
        id: 'authentication',
        title: 'Authentication',
        body: 'All requests require OAuth2 authentication...'
      }
    ]
  },
  content: {
    examples: {
      interactive_config: {
        provider: 'codesandbox',
        source_files: ['example.js', 'package.json']
      }
    },
    pages: {
      'rate-limits': {
        title: 'Rate Limits',
        body: 'API requests are limited to 1000 per minute...'
      }
    }
  },
  quality: {
    docs_health: { coverage: 85, missing_sections: ['webhooks'] },
    feedback_summary: { page_ratings: { 'authentication': 4.5 }, unhelpful_votes: 2 }
  },
  maintenance: {
    freshness_check: {
      enabled: true,
      source_code_path: './src/api/',
      last_code_change_at: '2025-11-08T14:30:00Z'
    }
  },
  governance: {
    policy: { classification: 'external', review_cycle_days: 30 }
  },
  metadata: {
    owner: 'devrel-team',
    tags: ['api', 'billing', 'public']
  }
});

// Check freshness
const outdated = apiDocs.findOutdated(30); // 30 day threshold
const coverage = apiDocs.analyzeCoverage();

// Generate documentation
const skeleton = apiDocs.generateDocsSkeleton();
const mermaidNav = apiDocs.generateMermaidNav();

// Generate protocol stubs (requires registry)
const stubs = apiDocs.generateProtocolStubs(registry);
```

### `createDocsCatalog(protocols = [])`

**Example:**
```javascript
import { createDocsCatalog } from '../src/Documentation Protocol — v1.1.1.js';

const catalog = createDocsCatalog([apiDocs, guideDocs, tutorialDocs]);

// Find documentation
const apiDocsList = catalog.find('documentation.format:=:md');
const publishedDocs = catalog.find('documentation.lifecycle.status:=:published');

// Validate all
const results = catalog.validateAll();

// Generate freshness report
const staleReport = catalog.freshnessReport(30);
```

## 4. Workflow Protocol Factories

### `createWorkflowProtocol(manifestInput = {})`

Creates workflow protocol instances for defining DAGs and orchestration.

**Example:**
```javascript
import { createWorkflowProtocol } from '../src/workflow_protocol_v_1_1_1.js';

const orderFulfillment = createWorkflowProtocol({
  workflow: {
    id: 'order-fulfillment',
    name: 'Order Fulfillment Workflow',
    purpose: 'From order placement to delivery',
    migration_strategy: 'finish_inflight'
  },
  sla: {
    timeout: '2h',
    on_timeout_event: 'workflow.timeout'
  },
  steps: [
    {
      id: 'validate',
      type: 'service',
      service: 'order.validate',
      inputs: {
        orderId: 'ctx.orderId'
      }
    },
    {
      id: 'charge',
      type: 'service',
      service: 'billing.charge',
      dependencies: ['validate'],
      inputs: {
        amount: { from: 'validate.total' },
        customerId: { from: 'validate.customerId' }
      },
      side_effects: true,
      retry: {
        retries: 3,
        backoff: 'exponential'
      }
    },
    {
      id: 'notify',
      type: 'event',
      dependencies: ['charge'],
      inputs: {
        userId: { from: 'validate.userId' },
        eventType: 'order.confirmed'
      }
    },
    {
      id: 'prepare',
      type: 'service',
      service: 'warehouse.prepare',
      dependencies: ['charge'],
      inputs: {
        items: { from: 'validate.items' }
      }
    },
    {
      id: 'ship',
      type: 'service',
      service: 'logistics.ship',
      dependencies: ['prepare'],
      inputs: {
        address: { from: 'validate.shippingAddress' }
      }
    },
    {
      id: 'approve',
      type: 'human',
      dependencies: ['charge'],
      human_task: {
        role: 'support',
        outcomes: ['approved', 'review', 'reject'],
        form_schema: {
          fields: [
            { name: 'notes', type: 'string', required: false },
            { name: 'priority', type: 'enum', options: ['standard', 'express'] }
          ]
        }
      },
      governance: {
        classification: 'confidential'
      }
    }
  ],
  metadata: {
    owner: 'commerce-team',
    tags: ['orders', 'fulfillment', 'critical']
  }
});

// Generate workflow engine
const engineCode = orderFulfillment.generateWorkflowEngine();

// Generate visual DAG
const mermaidDAG = orderFulfillment.generateVisualDAG();

// Generate agent stub (if workflow has agent steps)
const agentStub = orderFulfillment.generateAgentNodeStub('agentStepId', agentManifest);

// Generate test suite
const testSuite = orderFulfillment.generateTestSuite();

// Generate documentation
const docs = orderFulfillment.generateDocs();

// Generate configuration
const config = orderFulfillment.generateConfig();
```

### `createWorkflowCatalog(protocols = [])`

**Example:**
```javascript
import { createWorkflowCatalog } from '../src/workflow_protocol_v_1_1_1.js';

const catalog = createWorkflowCatalog([
  orderFulfillment,
  userOnboarding,
  paymentProcessing
]);

// Find workflows
const commerceWorkflows = catalog.find('metadata.tags:contains:commerce');
const humanSteps = catalog.find('steps:contains:human');

// Validate all
const results = catalog.validateAll();
```

## 5. Semantic Protocol Factories

### `createSemanticProtocol(manifestInput = {})`

Creates semantic protocol instances for criticality analysis and intent detection.

**Example:**
```javascript
import { createSemanticProtocol } from '../src/Semantic Protocol — v3.2.0.js';

const billingService = createSemanticProtocol({
  id: 'billing-service',
  element: {
    type: 'service',
    role: 'api'
  },
  semantics: {
    purpose: 'Process payments and manage invoices'
  },
  context: {
    domain: 'finance',
    flow: 'payment-processing',
    step: 'charge-credit-card',
    protocolBindings: {
      api: [{
        urn: 'urn:proto:api:billing@1.1.1',
        purpose: 'primary-interface',
        requires: ['auth:oauth2'],
        provides: ['payment:process', 'invoice:manage']
      }],
      data: [{
        urn: 'urn:proto:data:transactions@1.1.1',
        purpose: 'stores-transactions',
        requires: ['pii:encrypt'],
        provides: ['data:audit-trail']
      }]
    }
  },
  governance: {
    piiHandling: true,
    businessImpact: 9,
    userVisibility: 0.8,
    owner: 'finance-team'
  },
  relationships: {
    dependents: [
      'urn:proto:workflow:order-fulfillment@1.1.1',
      'urn:proto:event:payment.completed@1.1.1'
    ]
  },
  metadata: {
    description: 'Critical billing service handling all payment operations',
    tags: ['payment', 'billing', 'critical', 'pii']
  }
});

// The protocol automatically enriches the manifest with:
// - element.intent (e.g., 'Execute')
// - element.criticality (calculated score 0-1)
// - semantics.precision.confidence (calculated 0-1)
// - semantics.features.vector (64-dimensional semantic vector)

// Generate documentation
const docs = billingService.generateDocs();

// Diff with another version
const updated = billingService.set('governance.businessImpact', 10);
const changes = billingService.diff(updated);
```

### `createSemanticCatalog(protocols = [])`

**Example:**
```javascript
import { createSemanticCatalog } from '../src/Semantic Protocol — v3.2.0.js';

const catalog = createSemanticCatalog([
  billingService,
  userService,
  notificationService
]);

// Find by predicate
const criticalServices = catalog.find(p => 
  p.element.criticality > 0.7
);

// Discover relationships by semantic similarity
const relationships = catalog.discoverRelationships(0.85);
// Returns: [{ from: 'urn:proto:semantic:billing@3.2.0', to: 'urn:proto:semantic:payments@3.2.0', similarity: 0.92 }]
```

## 6. Agent Protocol Factories

### `createAgentProtocol(manifestInput = {})`

Creates agent protocol instances for AI agent definitions.

**Example:**
```javascript
import { createAgentProtocol } from '../src/agent_protocol_v_1_1_1.js';

const researchAgent = createAgentProtocol({
  version: "v1.1.1",
  agent: {
    id: 'research-agent-01',
    name: 'AI Research Assistant',
    version: '1.2.0',
    discovery_uri: 'https://agents.example.com/research.json',
    lifecycle: { status: 'enabled' }
  },
  capabilities: {
    tools: [
      {
        name: 'webSearch',
        description: 'Search the web for information',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            maxResults: { type: 'number' }
          },
          required: ['query']
        },
        outputSchema: {
          type: 'array',
          items: { type: 'object' }
        },
        urn: 'urn:proto:agent:tool:webSearch@1.0.0'
      },
      {
        name: 'readPaper',
        description: 'Read and summarize academic papers',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string' }
          },
          required: ['url']
        },
        outputSchema: { type: 'string' }
      }
    ],
    resources: [
      {
        uri: 'file:///data/knowledge-base.pdf',
        name: 'Knowledge Base',
        mimeType: 'application/pdf',
        urn: 'urn:proto:agent:resource:knowledge@1.0.0'
      },
      {
        uri: 'postgres://db/research',
        name: 'Research Database',
        mimeType: 'application/x-sql'
      }
    ],
    prompts: [
      {
        name: 'summarize',
        description: 'Summarize text in concise form',
        arguments: [
          { name: 'text', required: true },
          { name: 'maxLength', required: false }
        ],
        urn: 'urn:proto:agent:prompt:summarize@1.0.0'
      }
    ],
    modalities: {
      input: ['text', 'file'],
      output: ['text', 'json']
    }
  },
  communication: {
    supported: ['a2a', 'mcp'],
    endpoints: {
      a2a: 'https://agents.example.com/a2a',
      mcp: 'https://agents.example.com/mcp'
    },
    transport: {
      primary: 'https',
      streaming: 'sse',
      fallback: 'polling'
    }
  },
  authorization: {
    delegation_supported: true,
    signature_algorithm: 'Ed25519'
  },
  relationships: {
    models: ['urn:proto:ai:llama-3@1.0.0'],
    apis: ['urn:proto:api:search@1.1.1'],
    workflows: ['urn:proto:workflow:research@1.1.1'],
    roles: ['urn:proto:iam:role:researcher@1.0.0']
  },
  metadata: {
    owner: 'ai-team',
    tags: ['research', 'llm', 'tools']
  }
});

// Generate agent card
const agentCard = researchAgent.generateAgentCard();

// Generate documentation
const docs = researchAgent.generateDocs();

// Generate test skeleton
const jestTests = researchAgent.generateTest('jest');
const cypressTests = researchAgent.generateTest('cypress');
```

### `createAgentCatalog(protocols = [])`

**Example:**
```javascript
import { createAgentCatalog } from '../src/agent_protocol_v_1_1_1.js';

const catalog = createAgentCatalog([
  researchAgent,
  writerAgent,
  reviewerAgent
]);

// Find agents
const enabledAgents = catalog.find('agent.lifecycle.status:=:enabled');
const toolAgents = catalog.find('capabilities.tools:contains:webSearch');

// Validate all
const results = catalog.validateAll();
```

## 7. Event Protocol Factories

### `createEventProtocol(manifestInput = {})`

Creates event protocol instances for event-driven architectures.

**Example:**
```javascript
import { createEventProtocol } from '../src/event_protocol_v_1_1_1.js';

const paymentCompleted = createEventProtocol({
  version: "v1.1.1",
  event: {
    name: 'payment.completed',
    version: '1.1.0',
    lifecycle: { status: 'active' }
  },
  semantics: {
    purpose: 'Record successful payment and trigger fulfillment workflow'
  },
  schema: {
    format: 'json-schema',
    payload: {
      type: 'object',
      required: ['payment_id', 'user_id', 'amount', 'currency'],
      properties: {
        payment_id: { type: 'string' },
        user_id: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'] },
        email: { type: 'string', 'x-pii': true },
        method: { type: 'string' }
      }
    },
    fields: [
      { name: 'payment_id', type: 'string', required: true, description: 'Unique payment ID' },
      { name: 'user_id', type: 'string', required: true, description: 'User ID' },
      { name: 'amount', type: 'number', required: true, description: 'Payment amount' },
      { name: 'email', type: 'string', pii: true, description: 'Customer email (PII)' }
    ],
    compatibility: {
      policy: 'backward',
      compatible_versions: ['1.0.0', '1.1.0']
    }
  },
  delivery: {
    contract: {
      transport: 'kafka',
      topic: 'billing.payments',
      guarantees: 'at-least-once',
      retry_policy: 'exponential',
      dlq: 'billing.payments.dlq'
    }
  },
  governance: {
    policy: {
      classification: 'pii',
      legal_basis: 'gdpr'
    }
  },
  metadata: {
    owner: 'billing-team',
    tags: ['billing', 'payments', 'critical']
  }
});

// Check compatibility
const consumer = {
  eventName: 'payment.completed',
  version: '1.0.0'
};
const compatibility = paymentCompleted.checkCompatibility(consumer);

// Generate consumer skeleton
const consumerCode = paymentCompleted.generateConsumerSkeleton('javascript');

// Generate test scenarios
const testScenarios = paymentCompleted.generateTestScenarios();
```

### `createEventCatalog(protocols = [])`

**Example:**
```javascript
import { createEventCatalog } from '../src/event_protocol_v_1_1_1.js';

const catalog = createEventCatalog([
  paymentCompleted,
  userRegistered,
  orderShipped
]);

// Find events
const billingEvents = catalog.find('event.name:contains:payment');
const piiEvents = catalog.find('schema.pii:contains:email');

// Analyze event flow with workflows
const workflows = [orderFulfillmentWorkflow]; // WorkflowProtocol instances
const flowAnalysis = catalog.analyzeFlow(workflows);
// Returns: [{ event: 'payment.completed', consumers: ['billing.charge'], producers: ['payment.gateway'] }]

// Validate all
const results = catalog.validateAll();
```

## 8. UI Component Protocol Factories

### `createUIProtocol(manifestInput = {})`

Creates UI component protocol instances for component documentation.

**Example:**
```javascript
import { createUIProtocol } from '../src/ui_component_protocol_v_1_1_1.js';

const primaryButton = createUIProtocol({
  component: {
    id: 'btn-primary-01',
    name: 'Primary Button',
    type: 'atom',
    framework: 'react',
    version: '1.1.0'
  },
  design: {
    figma_url: 'https://figma.com/file/abc123/button',
    tokens: {
      colorBg: 'var(--color-primary)',
      colorText: 'var(--color-white)',
      radius: '8px',
      padding: '12px 24px'
    }
  },
  data: {
    props: [
      {
        name: 'label',
        type: 'string',
        required: true,
        description: 'Button text'
      },
      {
        name: 'onClick',
        type: 'object',
        required: true,
        description: 'Click handler function'
      },
      {
        name: 'disabled',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Disabled state'
      },
      {
        name: 'loading',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Loading state'
      },
      {
        name: 'variant',
        type: 'enum',
        required: false,
        default: 'primary',
        options: ['primary', 'secondary', 'danger'],
        description: 'Button style variant'
      }
    ],
    fetching: {
      endpoint: '/api/button/config',
      on_loading_state: 'loading',
      on_success_state: 'ready',
      on_error_state: 'error'
    }
  },
  behavior: {
    states: {
      idle: {
        description: 'Default state',
        associated_props: ['label', 'variant']
      },
      loading: {
        description: 'Loading state',
        associated_props: ['loading']
      },
      disabled: {
        description: 'Disabled state',
        associated_props: ['disabled']
      },
      error: {
        description: 'Error state',
        associated_props: []
      }
    },
    user_flows: [
      {
        name: 'Click Button',
        steps: [
          {
            interaction: 'click',
            target: 'button',
            outcome: 'loading'
          },
          {
            interaction: 'wait',
            target: 'async-operation',
            outcome: 'idle'
          }
        ]
      }
    ]
  },
  a11y: {
    contract: {
      role: 'button',
      label_prop: 'label',
      keyboard_support: ['enter', 'space']
    }
  },
  metadata: {
    owner: 'design-system-team',
    tags: ['button', 'ui', 'interactive']
  }
});

// Generate React component
const componentCode = primaryButton.generateComponent();

// Generate Storybook stories
const stories = primaryButton.generateStorybook();

// Generate Cypress tests
const tests = primaryButton.generateCypressTest();

// Generate documentation
const docs = primaryButton.generateDocs();

// Generate test suite
const testSuite = primaryButton.generateTestSuite();

// Generate configuration
const config = primaryButton.generateConfig();
```

### `createUICatalog(protocols = [])`

**Example:**
```javascript
import { createUICatalog } from '../src/ui_component_protocol_v_1_1_1.js';

const catalog = createUICatalog([
  primaryButton,
  textInput,
  card,
  modal
]);

// Find components
const interactiveComponents = catalog.find('behavior.states:contains:loading');
const reactComponents = catalog.find('component.framework:=:react');

// Validate all
const results = catalog.validateAll();
```

### `createDesignSystem(protocols = [])`

Specialized catalog for design systems.

**Example:**
```javascript
import { createDesignSystem } from '../src/ui_component_protocol_v_1_1_1.js';

const designSystem = createDesignSystem([
  primaryButton,
  secondaryButton,
  textInput,
  select,
  card,
  modal,
  layoutGrid
]);

// Validate entire design system
const results = designSystem.validateAll();

// Find components
const formComponents = designSystem.find('component.type:=:atom');
```

## 9. Identity & Access Protocol Factories

### `createIdentityProtocol(manifestInput = {})`

Creates identity and access protocol instances for IAM definitions.

**Example:**
```javascript
import { createIdentityProtocol } from '../src/Identity & Access Protocol — v1.1.1.js';

const supportAgent = createIdentityProtocol({
  identity: {
    id: 'user:support-agent-001',
    type: 'human',
    lifecycle: { status: 'active' }
  },
  profile: {
    email: 'support@example.com',
    name: 'Support Agent',
    dept: 'Customer Support'
  },
  authn: {
    factors: [
      { factor: 'password', required: true },
      { factor: 'otp', required: true, meta: { provider: 'google-authenticator' } }
    ],
    federation: {
      provider: 'oidc',
      issuer: 'https://auth.example.com',
      client_id: 'support-portal'
    }
  },
  authz: {
    roles: ['support', 'billing-viewer'],
    permissions: {
      'support': [
        'ticket:read',
        'ticket:write',
        'ticket:resolve',
        'customer:read'
      ],
      'billing-viewer': [
        'invoice:read',
        'payment:read'
      ]
    },
    roles_graph: {
      inherits: {
        'senior-support': ['support'],
        'support-manager': ['senior-support', 'billing-viewer']
      }
    }
  },
  policies: {
    governance: {
      classification: 'internal',
      rotation_days: 90
    },
    authn: {
      mfa_required: true,
      min_factors: 2
    }
  },
  relationships: {
    groups: ['group:support-team', 'group:customer-facing'],
    trusts: ['tenant:partner-support']
  },
  metadata: {
    owner: 'security-team',
    tags: ['support', 'customer-service', 'mfa-required']
  }
});

// Generate policy document
const policy = supportAgent.generatePolicy({ style: 'rbac' });

// Generate visual IAM map
const iamMap = supportAgent.generateVisualMap();

// Generate audit tests
const auditTests = supportAgent.generateAuditTests([
  'ticket:read',
  'ticket:write',
  'invoice:read'
]);

// Cross-validate with API
const apiValidation = supportAgent.crossValidateWithAPI(
  billingAPIManifest,
  (scope) => `scope:${scope}`
);

// Cross-validate with Data
const dataValidation = supportAgent.crossValidateWithData(
  transactionsDataManifest,
  { read: 'pii:read', write: 'pii:write' }
);

// Cross-validate with Workflow
const workflowValidation = supportAgent.crossValidateWithWorkflow(
  orderFulfillmentWorkflow,
  (step) => step.human_task?.role === 'support' ? ['support', 'senior-support'] : []
);

// Calculate effective permissions
const effectivePerms = supportAgent.effectivePermissions();
```

### `createIdentityCatalog(protocols = [])`

**Example:**
```javascript
import { createIdentityCatalog } from '../src/Identity & Access Protocol — v1.1.1.js';

const catalog = createIdentityCatalog([
  supportAgent,
  adminUser,
  serviceAccount,
  apiClient
]);

// Find identities
const activeUsers = catalog.find('identity.lifecycle.status:=:active');
const mfaUsers = catalog.find('policies.authn.mfa_required:=:true');

// Validate all
const results = catalog.validateAll();

// Find who has specific permission
const invoiceReaders = catalog.whoCan('invoice:read');

// Generate complete IAM map
const completeMap = catalog.generateVisualMapAll();
```

## 10. Delegation Manifest Factory

### `createDelegationManifest(delegatorUrn, delegateUrn, scopes, maxDepth, options = {})`

Creates delegation manifests for agent-to-agent authorization chains.

**Example:**
```javascript
import { createDelegationManifest, validateDelegationChain } from '../src/Identity & Access Protocol — v1.1.1.js';

// Create parent delegation
const parentDelegation = createDelegationManifest(
  'urn:proto:agent:supervisor@1.0.0',
  'urn:proto:agent:manager@1.0.0',
  ['task:read', 'task:write', 'task:delegate'],
  3, // max depth
  {
    expiresAt: '2025-12-31T23:59:59Z',
    constraints: {
      revoke_on_error: true
    }
  }
);

// Create child delegation (narrower scope)
const childDelegation = createDelegationManifest(
  'urn:proto:agent:manager@1.0.0',
  'urn:proto:agent:worker@1.0.0',
  ['task:read', 'task:write'], // subset of parent scopes
  2, // depth must be < parent
  {
    expiresAt: '2025-12-31T23:59:59Z'
  }
);

// Validate delegation chain
const validation = validateDelegationChain(parentDelegation, childDelegation);
// Returns: { ok: boolean, issues: [{ path, msg, level }] }

// Check expiration
const isExpired = isDelegationExpired(parentDelegation);
```

## Factory Function Summary Table

| Protocol | Single Factory | Catalog Factory | Key Features |
|----------|---------------|-----------------|--------------|
| **API** | `createAPIProtocol()` | `createAPICatalog()` | Client SDK generation, test generation |
| **Data** | `createDataProtocol()` | `createDataCatalog()` | Schema migration, cycle detection, PII egress |
| **Documentation** | `createDocsProtocol()` | `createDocsCatalog()` | Freshness checking, coverage analysis |
| **Workflow** | `createWorkflowProtocol()` | `createWorkflowCatalog()` | DAG generation, agent stubs, engine code |
| **Semantic** | `createSemanticProtocol()` | `createSemanticCatalog()` | Auto-enrichment, similarity discovery |
| **Agent** | `createAgentProtocol()` | `createAgentCatalog()` | Agent cards, delegation support |
| **Event** | `createEventProtocol()` | `createEventCatalog()` | Compatibility checking, flow analysis |
| **UI Component** | `createUIProtocol()` | `createUICatalog()` | Component generation, Storybook, tests |
| **Identity & Access** | `createIdentityProtocol()` | `createIdentityCatalog()` | Cross-validation, delegation chains |

## Common Patterns

### Pattern 1: Load and Validate
```javascript
const protocol = createXProtocol(manifest);
const validation = protocol.validate();
if (!validation.ok) {
  console.error('Invalid manifest:', validation.results);
}
```

### Pattern 2: Query and Filter
```javascript
const catalog = createXCatalog([p1, p2, p3]);
const matches = catalog.find('property:contains:value');
```

### Pattern 3: Diff and Migrate
```javascript
const v1 = createXProtocol(manifestV1);
const v2 = v1.set('path', 'newValue');
const changes = v1.diff(v2);
```

### Pattern 4: Generate Artifacts
```javascript
const protocol = createXProtocol(manifest);
const docs = protocol.generateDocs();
const tests = protocol.generateTests();
const code = protocol.generateCode();
```

### Pattern 5: Cross-Protocol Validation
```javascript
// Identity + API
identity.crossValidateWithAPI(apiManifest);

// Identity + Data
identity.crossValidateWithData(dataManifest);

// Identity + Workflow
identity.crossValidateWithWorkflow(workflowManifest);
```

This inventory provides comprehensive examples for all factory functions. Refer to the main protocol API reference guide for detailed method documentation and validator catalogs.