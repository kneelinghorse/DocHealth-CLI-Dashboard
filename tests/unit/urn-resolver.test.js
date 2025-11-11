import { test } from 'node:test';
import assert from 'node:assert';
import {
  parseURN,
  isValidURN,
  extractURNsFromManifest,
  createProtocolRegistry,
  validateURNs,
  generateRemediation,
  URN_PATTERN,
  VALID_NAMESPACES
} from '../../lib/urn-resolver.js';

// Test URN parsing
test('parseURN correctly parses valid URNs', () => {
  const testCases = [
    {
      urn: 'urn:proto:api:billing@1.1.1',
      expected: {
        urn: 'urn:proto:api:billing@1.1.1',
        namespace: 'api',
        identifier: 'billing',
        version: '1.1.1',
        anchor: null,
        isValid: true
      }
    },
    {
      urn: 'urn:proto:data:user_events@1.0.0#event_id',
      expected: {
        urn: 'urn:proto:data:user_events@1.0.0#event_id',
        namespace: 'data',
        identifier: 'user_events',
        version: '1.0.0',
        anchor: 'event_id',
        isValid: true
      }
    },
    {
      urn: 'urn:proto:workflow:order-fulfillment',
      expected: {
        urn: 'urn:proto:workflow:order-fulfillment',
        namespace: 'workflow',
        identifier: 'order-fulfillment',
        version: null,
        anchor: null,
        isValid: true
      }
    },
    {
      urn: 'urn:proto:api.endpoint:billing@1.1.1#GET-v1-invoices',
      expected: {
        urn: 'urn:proto:api.endpoint:billing@1.1.1#GET-v1-invoices',
        namespace: 'api.endpoint',
        identifier: 'billing',
        version: '1.1.1',
        anchor: 'GET-v1-invoices',
        isValid: true
      }
    }
  ];

  testCases.forEach(({ urn, expected }) => {
    const result = parseURN(urn);
    assert.deepStrictEqual(result, expected, `Failed to parse URN: ${urn}`);
  });
});

test('parseURN returns null for invalid URN formats', () => {
  const invalidURNs = [
    'not-a-urn',
    'urn:invalid',
    'urn:proto:api:',
    'urn:proto::item',
    12345,
    null,
    undefined,
    ''
  ];

  invalidURNs.forEach(urn => {
    const result = parseURN(urn);
    assert.strictEqual(result, null, `Should return null for invalid URN: ${urn}`);
  });
});

test('parseURN returns parsed object with isValid=false for invalid namespaces', () => {
  const result = parseURN('urn:proto:invalidnamespace:item');
  assert.notStrictEqual(result, null);
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.namespace, 'invalidnamespace');
});

test('isValidURN validates URN format and namespace', () => {
  // Valid URNs
  assert.strictEqual(isValidURN('urn:proto:api:billing@1.1.1'), true);
  assert.strictEqual(isValidURN('urn:proto:data:user_events'), true);
  assert.strictEqual(isValidURN('urn:proto:workflow:order-fulfillment'), true);
  assert.strictEqual(isValidURN('urn:proto:docs:api-reference'), true);
  assert.strictEqual(isValidURN('urn:proto:semantic:component@3.2.0'), true);
  assert.strictEqual(isValidURN('urn:proto:api.endpoint:billing@1.1.1#endpoint'), true);

  // Invalid URNs
  assert.strictEqual(isValidURN('urn:proto:invalid:item'), false);
  assert.strictEqual(isValidURN('not-a-urn'), false);
  assert.strictEqual(isValidURN(''), false);
  assert.strictEqual(isValidURN(null), false);
  assert.strictEqual(isValidURN(undefined), false);
});

test('VALID_NAMESPACES contains all expected namespaces', () => {
  const expectedNamespaces = [
    'api', 'api.endpoint', 'data', 'event', 'ui', 'workflow', 'infra',
    'device', 'ai', 'iam', 'metric', 'integration', 'testing', 'docs',
    'obs', 'config', 'release', 'agent', 'semantic'
  ];

  expectedNamespaces.forEach(ns => {
    assert.ok(VALID_NAMESPACES.has(ns), `Missing namespace: ${ns}`);
  });

  assert.strictEqual(VALID_NAMESPACES.size, expectedNamespaces.length);
});

test('extractURNsFromManifest extracts URNs from API protocol', () => {
  const apiManifest = {
    service: { name: 'billing' },
    interface: {
      endpoints: [
        {
          method: 'GET',
          path: '/v1/invoices',
          errors: [{ code: 'RATE_LIMITED', docs: 'urn:proto:docs:error-handling' }]
        }
      ]
    },
    relationships: {
      dependencies: ['urn:proto:data:user_accounts@1.0.0']
    }
  };

  const urns = extractURNsFromManifest(apiManifest, 'api');
  
  assert.ok(urns.includes('urn:proto:docs:error-handling'));
  assert.ok(urns.includes('urn:proto:data:user_accounts@1.0.0'));
});

test('extractURNsFromManifest extracts URNs from data protocol', () => {
  const dataManifest = {
    dataset: { name: 'user_events' },
    lineage: {
      sources: [
        { type: 'service', id: 'urn:proto:api:user-service@1.0.0' }
      ],
      consumers: [
        { type: 'model', id: 'urn:proto:ai:churn-model@1.0.0' }
      ]
    },
    schema: {
      keys: {
        foreign_keys: [
          { field: 'user_id', ref: 'urn:proto:data:users.id' }
        ]
      }
    }
  };

  const urns = extractURNsFromManifest(dataManifest, 'data');
  
  assert.ok(urns.includes('urn:proto:api:user-service@1.0.0'));
  assert.ok(urns.includes('urn:proto:ai:churn-model@1.0.0'));
  assert.ok(urns.includes('urn:proto:data:users.id'));
});

test('extractURNsFromManifest extracts URNs from workflow protocol', () => {
  const workflowManifest = {
    workflow: { id: 'order-fulfillment' },
    steps: [
      {
        id: 'validate',
        type: 'service',
        service: 'urn:proto:api:order-service@1.0.0'
      },
      {
        id: 'process',
        type: 'agent',
        agent: { urn: 'urn:proto:agent:processor@1.0.0' }
      }
    ]
  };

  const urns = extractURNsFromManifest(workflowManifest, 'workflow');
  
  assert.ok(urns.includes('urn:proto:api:order-service@1.0.0'));
  assert.ok(urns.includes('urn:proto:agent:processor@1.0.0'));
});

test('extractURNsFromManifest extracts URNs from docs protocol', () => {
  const docsManifest = {
    documentation: { id: 'api-reference' },
    links: {
      targets: [
        'urn:proto:api:billing@1.1.1',
        'urn:proto:data:user_events@1.0.0',
        'urn:proto:workflow:order-fulfillment'
      ]
    }
  };

  const urns = extractURNsFromManifest(docsManifest, 'docs');
  
  assert.ok(urns.includes('urn:proto:api:billing@1.1.1'));
  assert.ok(urns.includes('urn:proto:data:user_events@1.0.0'));
  assert.ok(urns.includes('urn:proto:workflow:order-fulfillment'));
  assert.strictEqual(urns.length, 3);
});

test('createProtocolRegistry builds correct registry from protocols', () => {
  // Mock protocol instances
  const mockAPIProtocol = {
    manifest: () => ({
      api: true,
      service: { name: 'billing' },
      version: '1.1.1',
      interface: {
        endpoints: [
          { method: 'GET', path: '/v1/invoices' },
          { method: 'POST', path: '/v1/invoices' }
        ]
      }
    })
  };

  const mockDataProtocol = {
    manifest: () => ({
      dataset: { name: 'user_events' },
      version: '1.0.0'
    })
  };

  const mockWorkflowProtocol = {
    manifest: () => ({
      workflow: { id: 'order-fulfillment' },
      version: '1.0.0'
    })
  };

  const protocols = [mockAPIProtocol, mockDataProtocol, mockWorkflowProtocol];
  const registry = createProtocolRegistry(protocols);

  // Check base URNs
  assert.ok(registry.has('urn:proto:api:billing@1.1.1'));
  assert.ok(registry.has('urn:proto:data:user_events@1.0.0'));
  assert.ok(registry.has('urn:proto:workflow:order-fulfillment@1.0.0'));

  // Check endpoint URNs
  assert.ok(registry.has('urn:proto:api:billing@1.1.1#GET-v1-invoices'));
  assert.ok(registry.has('urn:proto:api:billing@1.1.1#POST-v1-invoices'));

  // Check registry entries
  const apiEntry = registry.get('urn:proto:api:billing@1.1.1');
  assert.strictEqual(apiEntry.type, 'api');
  assert.ok(apiEntry.manifest);
  assert.ok(apiEntry.protocol);

  const endpointEntry = registry.get('urn:proto:api:billing@1.1.1#GET-v1-invoices');
  assert.strictEqual(endpointEntry.type, 'api.endpoint');
  assert.ok(endpointEntry.endpoint);
  assert.strictEqual(endpointEntry.index, 0);
});

test('validateURNs correctly categorizes URNs', () => {
  const registry = new Map([
    ['urn:proto:api:billing@1.1.1', { type: 'api' }],
    ['urn:proto:data:user_events@1.0.0', { type: 'data' }]
  ]);

  const urns = [
    'urn:proto:api:billing@1.1.1',           // valid
    'urn:proto:data:user_events@1.0.0',      // valid
    'urn:proto:api:nonexistent@1.0.0',       // broken
    'urn:proto:invalid:item',                // invalid namespace
    'not-a-urn'                              // invalid format
  ];

  const results = validateURNs(urns, registry);

  assert.strictEqual(results.valid.length, 2);
  assert.ok(results.valid.includes('urn:proto:api:billing@1.1.1'));
  assert.ok(results.valid.includes('urn:proto:data:user_events@1.0.0'));

  assert.strictEqual(results.broken.length, 1);
  assert.ok(results.broken.includes('urn:proto:api:nonexistent@1.0.0'));

  assert.strictEqual(results.invalid.length, 2);
  assert.ok(results.invalid.includes('urn:proto:invalid:item'));
  assert.ok(results.invalid.includes('not-a-urn'));

  // Check details
  assert.ok(results.details['urn:proto:api:billing@1.1.1'].status === 'resolved');
  assert.ok(results.details['urn:proto:api:nonexistent@1.0.0'].error === 'Unresolved reference');
});

test('generateRemediation provides actionable suggestions', () => {
  const brokenURNs = [
    'urn:proto:api:missing-api@1.0.0',
    'urn:proto:data:unknown-dataset@2.0.0#field',
    'urn:proto:invalid:bad-namespace@1.0.0'
  ];

  const remediation = generateRemediation(brokenURNs);

  assert.strictEqual(remediation.length, 3);

  // API URN suggestions
  const apiRemediation = remediation.find(r => r.urn.includes('missing-api'));
  assert.ok(apiRemediation.suggestions.some(s => s.toLowerCase().includes('api')));
  assert.ok(apiRemediation.suggestions.some(s => s.includes('service.name')));

  // Data URN suggestions
  const dataRemediation = remediation.find(r => r.urn.includes('unknown-dataset'));
  assert.ok(dataRemediation.suggestions.some(s => s.toLowerCase().includes('data')));
  assert.ok(dataRemediation.suggestions.some(s => s.includes('dataset.name')));

  // Version suggestion
  assert.ok(dataRemediation.suggestions.some(s => s.includes('version')));

  // Anchor suggestion
  assert.ok(dataRemediation.suggestions.some(s => s.includes('anchor')));
});