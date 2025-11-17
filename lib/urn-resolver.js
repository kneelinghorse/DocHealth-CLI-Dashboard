/**
 * URN Resolver & Link Validator
 * Validates cross-protocol URNs and surfaces broken references
 */

// URN Pattern - comprehensive regex covering all protocol namespaces
const URN_PATTERN = /^urn:proto:(?<namespace>[a-z]+(?:\.[a-z]+)?):(?<identifier>[a-zA-Z0-9._/-]+)(?:@(?<version>[\d.]+))?(?:#(?<anchor>[^#\s]+))?$/;

// Valid namespaces across all protocols
const VALID_NAMESPACES = new Set([
  'api', 'api.endpoint', 'data', 'event', 'ui', 'workflow', 'infra', 
  'device', 'ai', 'iam', 'metric', 'integration', 'testing', 'docs', 
  'obs', 'config', 'release', 'agent', 'semantic'
]);

/**
 * Parse a URN string into its components
 * @param {string} urn - The URN to parse
 * @returns {Object|null} Parsed URN components or null if invalid format
 */
function parseURN(urn) {
  if (typeof urn !== 'string') return null;
  
  const match = urn.match(URN_PATTERN);
  if (!match) return null;
  
  const { namespace, identifier, version, anchor } = match.groups;
  return {
    urn,
    namespace,
    identifier,
    version: version || null,
    anchor: anchor || null,
    isValid: VALID_NAMESPACES.has(namespace)
  };
}

/**
 * Validate if a string is a properly formatted URN
 * @param {string} urn - The URN to validate
 * @returns {boolean} True if valid URN format and namespace
 */
function isValidURN(urn) {
  if (typeof urn !== 'string') return false;
  const parsed = parseURN(urn);
  return parsed !== null && parsed.isValid;
}

/**
 * Extract all URNs from a protocol manifest
 * @param {Object} manifest - Protocol manifest
 * @param {string} protocolType - Type of protocol (api, data, workflow, etc.)
 * @returns {Array<string>} Array of URNs found in the manifest
 */
function extractURNsFromManifest(manifest, protocolType) {
  const urns = new Set();
  
  // Helper to recursively search for URN patterns in objects
  function searchForURNs(obj) {
    if (!obj) return;
    
    // Handle string directly
    if (typeof obj === 'string') {
      if (isValidURN(obj)) {
        urns.add(obj);
      }
      return;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];
        if (typeof item === 'string' && isValidURN(item)) {
          urns.add(item);
        } else if (typeof item === 'object' && item !== null) {
          searchForURNs(item);
        }
      }
      return;
    }
    
    // Handle objects
    if (typeof obj === 'object') {
      const values = Object.values(obj);
      for (let i = 0; i < values.length; i++) {
        searchForURNs(values[i]);
      }
    }
  }
  
  // Protocol-specific URN extraction
  switch (protocolType) {
    case 'api':
      // API protocols may reference other APIs or data protocols
      searchForURNs(manifest.interface?.endpoints);
      searchForURNs(manifest.relationships);
      break;
      
    case 'data':
      // Data protocols reference sources and consumers
      searchForURNs(manifest.lineage?.sources);
      searchForURNs(manifest.lineage?.consumers);
      searchForURNs(manifest.schema?.keys?.foreign_keys);
      break;
      
    case 'workflow':
      // Workflow protocols reference services and agents
      searchForURNs(manifest.steps);
      break;
      
    case 'docs':
      // Documentation protocols explicitly list target URNs
      if (manifest.links?.targets) {
        manifest.links.targets.forEach(urn => {
          if (isValidURN(urn)) urns.add(urn);
        });
      }
      break;
      
    case 'semantic':
      // Semantic protocols have rich protocol bindings
      searchForURNs(manifest.context?.protocolBindings);
      break;
  }
  
  return Array.from(urns);
}

/**
 * Create a protocol registry from loaded protocols
 * @param {Array<Object>} protocols - Array of loaded protocol instances
 * @returns {Map<string, Object>} Registry mapping URNs to protocol info
 */
function createProtocolRegistry(protocols) {
  const registry = new Map();
  
  protocols.forEach(protocol => {
    const manifest = protocol.manifest();
    let protocolType, baseURN;
    
    // Determine protocol type and construct base URN
    if (manifest.api || manifest.interface) {
      protocolType = 'api';
      baseURN = `urn:proto:api:${manifest.service?.name}@${manifest.version || '1.0.0'}`;
    } else if (manifest.dataset) {
      protocolType = 'data';
      baseURN = `urn:proto:data:${manifest.dataset?.name}@${manifest.version || '1.0.0'}`;
    } else if (manifest.workflow) {
      protocolType = 'workflow';
      baseURN = `urn:proto:workflow:${manifest.workflow?.id}@${manifest.version || '1.0.0'}`;
    } else if (manifest.documentation) {
      protocolType = 'docs';
      baseURN = `urn:proto:docs:${manifest.documentation?.id}@${manifest.version || '1.0.0'}`;
    } else if (manifest.urn) {
      // Semantic protocol
      const parsed = parseURN(manifest.urn);
      if (parsed) {
        protocolType = parsed.namespace;
        baseURN = manifest.urn;
      }
    }
    
    if (baseURN) {
      // Register the base protocol
      registry.set(baseURN, {
        type: protocolType,
        manifest: manifest,
        protocol: protocol
      });
      
      // Register any anchors or sub-components
      if (protocolType === 'api' && manifest.interface?.endpoints) {
        manifest.interface.endpoints.forEach((endpoint, index) => {
          const cleanPath = endpoint.path.replace(/[/{}]/g, '-').replace(/^-|-$/g, '');
          const endpointURN = `${baseURN}#${endpoint.method}-${cleanPath}`;
          registry.set(endpointURN, {
            type: 'api.endpoint',
            manifest: manifest,
            endpoint: endpoint,
            index: index
          });
        });
      }
    }
  });
  
  return registry;
}

/**
 * Validate URNs against a protocol registry
 * @param {Array<string>} urns - URNs to validate
 * @param {Map<string, Object>} registry - Protocol registry
 * @returns {Object} Validation results with valid/invalid URNs
 */
function validateURNs(urns, registry) {
  const results = {
    valid: [],
    invalid: [],
    broken: [],
    details: {}
  };
  
  urns.forEach(urn => {
    const parsed = parseURN(urn);
    
    if (!parsed) {
      results.invalid.push(urn);
      results.details[urn] = { error: 'Invalid URN format' };
      return;
    }
    
    if (!VALID_NAMESPACES.has(parsed.namespace)) {
      results.invalid.push(urn);
      results.details[urn] = { error: `Invalid namespace: ${parsed.namespace}` };
      return;
    }
    
    // Check if URN exists in registry
    if (registry.has(urn)) {
      results.valid.push(urn);
      results.details[urn] = { status: 'resolved', type: registry.get(urn).type };
    } else {
      // Check for base URN without anchor
      const baseURN = urn.split('#')[0];
      if (registry.has(baseURN)) {
        results.valid.push(urn);
        results.details[urn] = { status: 'resolved', type: registry.get(baseURN).type };
      } else {
        results.broken.push(urn);
        results.details[urn] = { 
          error: 'Unresolved reference', 
          namespace: parsed.namespace,
          identifier: parsed.identifier 
        };
      }
    }
  });
  
  return results;
}

/**
 * Generate actionable remediation text for broken URNs
 * @param {Array<string>} brokenURNs - Array of broken URNs
 * @returns {Array<Object>} Array of remediation suggestions
 */
function generateRemediation(brokenURNs) {
  return brokenURNs.map(urn => {
    const parsed = parseURN(urn);
    if (!parsed) return { urn, suggestion: 'Invalid URN format - check syntax' };
    
    const suggestions = [];
    
    switch (parsed.namespace) {
      case 'api':
        suggestions.push(`Check if API protocol '${parsed.identifier}' exists in src/ directory`);
        suggestions.push(`Ensure API name matches 'service.name' in the protocol manifest`);
        break;
        
      case 'data':
        suggestions.push(`Verify data protocol '${parsed.identifier}' is defined in src/`);
        suggestions.push(`Check that dataset name matches 'dataset.name' in manifest`);
        break;
        
      case 'workflow':
        suggestions.push(`Confirm workflow '${parsed.identifier}' exists in workflow protocols`);
        suggestions.push(`Check 'workflow.id' matches the URN identifier`);
        break;
        
      case 'docs':
        suggestions.push(`Ensure documentation '${parsed.identifier}' protocol is loaded`);
        break;
        
      case 'semantic':
        suggestions.push(`Verify semantic protocol '${parsed.identifier}' is registered`);
        break;
        
      default:
        suggestions.push(`Check if ${parsed.namespace} protocol '${parsed.identifier}' exists`);
    }
    
    if (parsed.version) {
      suggestions.push(`Verify version '${parsed.version}' is correct`);
    }
    
    if (parsed.anchor) {
      suggestions.push(`Check if anchor '${parsed.anchor}' exists in the target protocol`);
    }
    
    return {
      urn,
      namespace: parsed.namespace,
      identifier: parsed.identifier,
      suggestions
    };
  });
}

module.exports = {
  URN_PATTERN,
  VALID_NAMESPACES,
  parseURN,
  isValidURN,
  extractURNsFromManifest,
  createProtocolRegistry,
  validateURNs,
  generateRemediation
};
