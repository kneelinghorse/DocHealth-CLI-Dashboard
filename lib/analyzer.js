/**
 * Freshness Analyzer - Detect stale documentation by comparing code vs doc timestamps
 */

/**
 * Extract timestamps from protocol manifest
 * @param {Object} manifest - Protocol manifest object
 * @returns {Object} - { lastCodeChange, lastDocUpdate, hasTimestamps }
 */
function extractTimestamps(manifest) {
  const lastCodeChange = manifest?.maintenance?.freshness_check?.last_code_change_at;
  const lastDocUpdate = manifest?.lifecycle?.updated_at;
  
  return {
    lastCodeChange,
    lastDocUpdate,
    hasTimestamps: !!(lastCodeChange && lastDocUpdate)
  };
}

/**
 * Calculate days between two dates
 * @param {string} date1 - ISO date string
 * @param {string} date2 - ISO date string
 * @returns {number} - Days difference
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if documentation is stale
 * @param {Object} manifest - Protocol manifest object
 * @param {Object} options - Options
 * @param {number} options.thresholdDays - Days threshold for staleness (default: 7)
 * @returns {Object} - Staleness analysis
 */
function checkStaleness(manifest, options = {}) {
  const { thresholdDays = 7 } = options;
  const { lastCodeChange, lastDocUpdate, hasTimestamps } = extractTimestamps(manifest);
  
  // Check if freshness checking is enabled
  const freshnessEnabled = manifest?.maintenance?.freshness_check?.enabled !== false;
  if (!freshnessEnabled) {
    return {
      isStale: false,
      daysStale: 0,
      reason: 'Freshness checking disabled',
      enabled: false,
      hasTimestamps,
      lastCodeChange,
      lastDocUpdate
    };
  }
  
  if (!hasTimestamps) {
    return {
      isStale: true,
      daysStale: null,
      reason: 'Missing timestamps',
      enabled: true,
      hasTimestamps: false,
      lastCodeChange,
      lastDocUpdate
    };
  }
  
  const daysSinceCodeChange = daysBetween(lastCodeChange, new Date().toISOString());
  const daysSinceDocUpdate = daysBetween(lastDocUpdate, new Date().toISOString());
  
  // If docs were updated after code change, they're fresh
  if (new Date(lastDocUpdate) >= new Date(lastCodeChange)) {
    return {
      isStale: false,
      daysStale: 0,
      daysSinceCodeChange,
      daysSinceDocUpdate,
      reason: 'Documentation up to date',
      enabled: true,
      hasTimestamps: true,
      lastCodeChange,
      lastDocUpdate
    };
  }
  
  // Calculate staleness
  const daysStale = daysBetween(lastCodeChange, lastDocUpdate);
  
  return {
    isStale: daysStale > thresholdDays,
    daysStale,
    daysSinceCodeChange,
    daysSinceDocUpdate,
    thresholdDays,
    reason: daysStale > thresholdDays ? 'Documentation outdated' : 'Within threshold',
    enabled: true,
    hasTimestamps: true,
    lastCodeChange,
    lastDocUpdate
  };
}

/**
 * Assign severity level based on days stale
 * @param {number} daysStale - Number of days documentation is stale
 * @returns {string} - Severity level
 */
function assignSeverity(daysStale) {
  if (daysStale === null || daysStale === undefined) return 'unknown';
  if (daysStale === 0) return 'fresh';
  if (daysStale >= 30) return 'critical';
  if (daysStale >= 14) return 'high';
  if (daysStale >= 7) return 'medium';
  return 'low';
}

/**
 * Calculate freshness score (0-1, where 1 is perfectly fresh)
 * @param {Object} staleness - Staleness analysis result
 * @returns {number} - Freshness score
 */
function calculateFreshnessScore(staleness) {
  if (!staleness.enabled) return 0.5; // Neutral score if disabled
  if (!staleness.hasTimestamps) return 0.3; // Low score if missing data
  
  if (!staleness.isStale) {
    // Fresh documentation gets high score
    return 0.9 + (0.1 * Math.max(0, 1 - staleness.daysSinceDocUpdate / 30));
  }
  
  // Stale documentation - score decreases with age
  const { daysStale } = staleness;
  if (daysStale >= 90) return 0.1;
  if (daysStale >= 60) return 0.2;
  if (daysStale >= 30) return 0.3;
  if (daysStale >= 14) return 0.5;
  if (daysStale >= 7) return 0.7;
  return 0.8;
}

/**
 * Analyze freshness of a protocol manifest
 * @param {Object} manifest - Protocol manifest object
 * @param {Object} options - Analysis options
 * @returns {Object} - Complete freshness analysis
 */
function analyzeFreshness(manifest, options = {}) {
  const staleness = checkStaleness(manifest, options);
  const freshnessScore = calculateFreshnessScore(staleness);
  const severity = assignSeverity(staleness.daysStale);
  
  // Generate recommendations
  let recommendations = [];
  if (!staleness.enabled) {
    recommendations.push('Enable freshness checking in maintenance.freshness_check.enabled');
  }
  if (!staleness.hasTimestamps) {
    recommendations.push('Add missing timestamps: last_code_change_at and/or updated_at');
  }
  if (staleness.isStale) {
    recommendations.push(`Update documentation - ${staleness.daysStale} days stale`);
    if (severity === 'critical' || severity === 'high') {
      recommendations.push('High priority: Documentation severely outdated');
    }
  }
  if (staleness.daysSinceDocUpdate > 30) {
    recommendations.push('Consider reviewing documentation for accuracy');
  }
  
  return {
    healthScore: Math.round(freshnessScore * 100),
    freshnessScore,
    isStale: staleness.isStale,
    severity,
    daysStale: staleness.daysStale,
    daysSinceCodeChange: staleness.daysSinceCodeChange,
    daysSinceDocUpdate: staleness.daysSinceDocUpdate,
    thresholdDays: staleness.thresholdDays,
    enabled: staleness.enabled,
    hasTimestamps: staleness.hasTimestamps,
    lastCodeChange: staleness.lastCodeChange,
    lastDocUpdate: staleness.lastDocUpdate,
    recommendations,
    timestamp: new Date().toISOString()
  };
}

/**
 * Analyze multiple protocols and return aggregated results
 * @param {Array} manifests - Array of protocol manifests
 * @param {Array} protocolTypes - Array of protocol types corresponding to manifests
 * @param {Object} options - Analysis options
 * @returns {Object} - Aggregated analysis results
 */
function analyzeMultipleProtocols(manifests, protocolTypes = [], options = {}) {
  const results = manifests.map((manifest, index) => {
    const protocolType = protocolTypes[index] || 'unknown';
    const freshnessAnalysis = analyzeFreshness(manifest, options);
    const coverageAnalysis = analyzeCoverage(manifest, protocolType);
    const combinedAnalysis = calculateCombinedHealthScore(freshnessAnalysis, coverageAnalysis);
    
    return {
      id: manifest?.documentation?.id || manifest?.service?.name || manifest?.dataset?.name || manifest?.workflow?.id || 'unknown',
      type: protocolType,
      freshness: freshnessAnalysis,
      coverage: coverageAnalysis,
      combined: combinedAnalysis
    };
  });
  
  const total = results.length;
  const staleCount = results.filter(r => r.freshness.isStale).length;
  const enabledCount = results.filter(r => r.freshness.enabled).length;
  const hasTimestampsCount = results.filter(r => r.freshness.hasTimestamps).length;
  
  // Calculate average scores
  const avgFreshnessScore = total > 0
    ? results.reduce((sum, r) => sum + r.freshness.freshnessScore, 0) / total
    : 0;
  
  const avgCoverageScore = total > 0
    ? results.reduce((sum, r) => sum + r.coverage.coverageScore, 0) / total
    : 0;
  
  const avgCombinedScore = total > 0
    ? results.reduce((sum, r) => sum + r.combined.combinedScore, 0) / total
    : 0;
  
  const severityCounts = results.reduce((acc, r) => {
    const severity = r.freshness.severity;
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});
  
  // Coverage-specific aggregations
  const totalItems = results.reduce((sum, r) => sum + (r.coverage.totalItems || 0), 0);
  const documentedItems = results.reduce((sum, r) => sum + (r.coverage.documentedItems || 0), 0);
  const overallCoveragePercentage = totalItems > 0 ? documentedItems / totalItems : 0;
  
  return {
    total,
    staleCount,
    enabledCount,
    hasTimestampsCount,
    avgFreshnessScore: Math.round(avgFreshnessScore * 100),
    avgCoverageScore: Math.round(avgCoverageScore * 100),
    avgCombinedScore: Math.round(avgCombinedScore * 100),
    overallCoveragePercentage: Math.round(overallCoveragePercentage * 100),
    severityBreakdown: severityCounts,
    protocols: results,
    summary: {
      overallStatus: staleCount === 0 ? 'healthy' : staleCount > total / 2 ? 'critical' : 'warning',
      needsAttention: results.filter(r => r.freshness.isStale || !r.freshness.hasTimestamps || r.coverage.coveragePercentage < 0.5)
    },
    coverageSummary: {
      totalItems,
      documentedItems,
      coveragePercentage: Math.round(overallCoveragePercentage * 100)
    }
  };
}

/**
 * Calculate coverage score for API protocol endpoints
 * @param {Object} manifest - API protocol manifest
 * @returns {Object} - Coverage analysis for API endpoints
 */
function analyzeAPICoverage(manifest) {
  const endpoints = manifest?.interface?.endpoints || [];
  const totalEndpoints = endpoints.length;
  
  if (totalEndpoints === 0) {
    return {
      coverageScore: 0,
      totalEndpoints: 0,
      documentedEndpoints: 0,
      coveragePercentage: 0,
      missingDocumentation: [],
      recommendations: ['No endpoints found in API protocol']
    };
  }
  
  // Check each endpoint for documentation completeness
  let documentedCount = 0;
  const missingDocs = [];
  
  endpoints.forEach((endpoint, index) => {
    const hasSummary = !!endpoint.summary;
    const hasDescription = !!endpoint.description;
    const hasParams = Array.isArray(endpoint.params) && endpoint.params.length > 0;
    const hasResponses = Array.isArray(endpoint.responses) && endpoint.responses.length > 0;
    
    // Consider endpoint documented if it has summary and at least params or responses
    const isDocumented = hasSummary && (hasParams || hasResponses);
    
    if (isDocumented) {
      documentedCount++;
    } else {
      const path = endpoint.path || `endpoint_${index}`;
      const missing = [];
      if (!hasSummary) missing.push('summary');
      if (!hasDescription) missing.push('description');
      if (!hasParams) missing.push('parameters');
      if (!hasResponses) missing.push('responses');
      
      missingDocs.push({
        path,
        method: endpoint.method || 'UNKNOWN',
        missingFields: missing
      });
    }
  });
  
  const coveragePercentage = totalEndpoints > 0 ? documentedCount / totalEndpoints : 0;
  const coverageScore = coveragePercentage; // 0-1 scale
  
  // Generate recommendations
  const recommendations = [];
  if (documentedCount === 0) {
    recommendations.push('No endpoints have documentation - add summaries and parameters/responses');
  } else if (documentedCount < totalEndpoints) {
    recommendations.push(`${totalEndpoints - documentedCount} endpoints need documentation`);
    if (missingDocs.length > 0) {
      const example = missingDocs[0];
      recommendations.push(`Example: ${example.method} ${example.path} missing: ${example.missingFields.join(', ')}`);
    }
  }
  
  return {
    coverageScore,
    totalEndpoints,
    documentedEndpoints: documentedCount,
    coveragePercentage,
    missingDocumentation: missingDocs,
    recommendations
  };
}

/**
 * Calculate coverage score for Data protocol fields
 * @param {Object} manifest - Data protocol manifest
 * @returns {Object} - Coverage analysis for data fields
 */
function analyzeDataCoverage(manifest) {
  const fields = manifest?.schema?.fields || {};
  const fieldNames = Object.keys(fields);
  const totalFields = fieldNames.length;
  
  if (totalFields === 0) {
    return {
      coverageScore: 0,
      totalFields: 0,
      documentedFields: 0,
      coveragePercentage: 0,
      missingDocumentation: [],
      recommendations: ['No fields found in data schema']
    };
  }
  
  // Check each field for description
  let documentedCount = 0;
  const missingDocs = [];
  
  fieldNames.forEach(fieldName => {
    const field = fields[fieldName];
    const hasDescription = !!field?.description;
    const hasType = !!field?.type;
    
    // Consider field documented if it has description
    if (hasDescription) {
      documentedCount++;
    } else {
      missingDocs.push({
        fieldName,
        missingFields: !hasDescription ? ['description'] : []
      });
    }
  });
  
  const coveragePercentage = totalFields > 0 ? documentedCount / totalFields : 0;
  const coverageScore = coveragePercentage;
  
  // Generate recommendations
  const recommendations = [];
  if (documentedCount === 0) {
    recommendations.push('No fields have descriptions - add descriptions to all fields');
  } else if (documentedCount < totalFields) {
    recommendations.push(`${totalFields - documentedCount} fields need descriptions`);
    if (missingDocs.length > 0) {
      const example = missingDocs[0];
      recommendations.push(`Example: field '${example.fieldName}' missing description`);
    }
  }
  
  return {
    coverageScore,
    totalFields,
    documentedFields: documentedCount,
    coveragePercentage,
    missingDocumentation: missingDocs,
    recommendations
  };
}

/**
 * Calculate coverage score for Workflow protocol steps
 * @param {Object} manifest - Workflow protocol manifest
 * @returns {Object} - Coverage analysis for workflow steps
 */
function analyzeWorkflowCoverage(manifest) {
  const steps = manifest?.steps || [];
  const totalSteps = steps.length;
  
  if (totalSteps === 0) {
    return {
      coverageScore: 0,
      totalSteps: 0,
      documentedSteps: 0,
      coveragePercentage: 0,
      missingDocumentation: [],
      recommendations: ['No steps found in workflow']
    };
  }
  
  // Check each step for description and other documentation
  let documentedCount = 0;
  const missingDocs = [];
  
  steps.forEach((step, index) => {
    const hasDescription = !!step.description;
    const hasId = !!step.id;
    const hasType = !!step.type;
    
    // Consider step documented if it has description and basic fields
    const isDocumented = hasDescription && hasId && hasType;
    
    if (isDocumented) {
      documentedCount++;
    } else {
      const stepId = step.id || `step_${index}`;
      const missing = [];
      if (!hasDescription) missing.push('description');
      if (!hasId) missing.push('id');
      if (!hasType) missing.push('type');
      
      missingDocs.push({
        stepId,
        missingFields: missing
      });
    }
  });
  
  const coveragePercentage = totalSteps > 0 ? documentedCount / totalSteps : 0;
  const coverageScore = coveragePercentage;
  
  // Generate recommendations
  const recommendations = [];
  if (documentedCount === 0) {
    recommendations.push('No steps have descriptions - add descriptions to all steps');
  } else if (documentedCount < totalSteps) {
    recommendations.push(`${totalSteps - documentedCount} steps need documentation`);
    if (missingDocs.length > 0) {
      const example = missingDocs[0];
      recommendations.push(`Example: step '${example.stepId}' missing: ${example.missingFields.join(', ')}`);
    }
  }
  
  return {
    coverageScore,
    totalSteps,
    documentedSteps: documentedCount,
    coveragePercentage,
    missingDocumentation: missingDocs,
    recommendations
  };
}

/**
 * Analyze coverage for a protocol manifest based on its type
 * @param {Object} manifest - Protocol manifest object
 * @param {string} protocolType - Type of protocol (api, data, workflow, etc.)
 * @returns {Object} - Coverage analysis results
 */
function analyzeCoverage(manifest, protocolType) {
  let coverageResult = {
    coverageScore: 0,
    coveragePercentage: 0,
    totalItems: 0,
    documentedItems: 0,
    missingDocumentation: [],
    recommendations: ['Unable to determine coverage for protocol type']
  };
  
  switch (protocolType) {
    case 'api':
      coverageResult = analyzeAPICoverage(manifest);
      break;
    case 'data':
      coverageResult = analyzeDataCoverage(manifest);
      break;
    case 'workflow':
      coverageResult = analyzeWorkflowCoverage(manifest);
      break;
    default:
      // For other protocol types, return basic structure
      coverageResult.recommendations = [`Coverage analysis not implemented for ${protocolType} protocols`];
  }
  
  return {
    ...coverageResult,
    protocolType,
    timestamp: new Date().toISOString()
  };
}

/**
 * Calculate combined health score including freshness and coverage
 * @param {Object} freshnessResult - Result from analyzeFreshness()
 * @param {Object} coverageResult - Result from analyzeCoverage()
 * @param {Object} options - Weight configuration
 * @returns {Object} - Combined health analysis
 */
function calculateCombinedHealthScore(freshnessResult, coverageResult, options = {}) {
  const {
    freshnessWeight = 0.6, // 60% freshness, 40% coverage per roadmap
    coverageWeight = 0.4
  } = options;
  
  // Normalize scores to 0-1 range
  const freshnessScore = freshnessResult.freshnessScore || 0;
  const coverageScore = coverageResult.coverageScore || 0;
  
  // Calculate weighted combined score
  const combinedScore = (freshnessScore * freshnessWeight) + (coverageScore * coverageWeight);
  const healthScore = Math.round(combinedScore * 100);
  
  // Merge recommendations
  const allRecommendations = [
    ...freshnessResult.recommendations,
    ...coverageResult.recommendations
  ];
  
  return {
    healthScore,
    combinedScore,
    freshnessScore,
    coverageScore,
    freshnessWeight,
    coverageWeight,
    recommendations: allRecommendations,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  analyzeFreshness,
  checkStaleness,
  calculateFreshnessScore,
  extractTimestamps,
  assignSeverity,
  analyzeMultipleProtocols,
  daysBetween,
  analyzeCoverage,
  analyzeAPICoverage,
  analyzeDataCoverage,
  analyzeWorkflowCoverage,
  calculateCombinedHealthScore
};
