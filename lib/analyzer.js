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
  
  // Check if freshness checking is enabled
  const freshnessEnabled = manifest?.maintenance?.freshness_check?.enabled !== false;
  if (!freshnessEnabled) {
    return {
      isStale: false,
      daysStale: 0,
      reason: 'Freshness checking disabled',
      enabled: false
    };
  }
  
  const { lastCodeChange, lastDocUpdate, hasTimestamps } = extractTimestamps(manifest);
  
  if (!hasTimestamps) {
    return {
      isStale: true,
      daysStale: null,
      reason: 'Missing timestamps',
      enabled: true,
      hasTimestamps: false
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
      hasTimestamps: true
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
    hasTimestamps: true
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
 * @param {Object} options - Analysis options
 * @returns {Object} - Aggregated analysis results
 */
function analyzeMultipleProtocols(manifests, options = {}) {
  const results = manifests.map(manifest => ({
    id: manifest?.documentation?.id || 'unknown',
    analysis: analyzeFreshness(manifest, options)
  }));
  
  const total = results.length;
  const staleCount = results.filter(r => r.analysis.isStale).length;
  const enabledCount = results.filter(r => r.analysis.enabled).length;
  const hasTimestampsCount = results.filter(r => r.analysis.hasTimestamps).length;
  
  const avgHealthScore = total > 0 
    ? results.reduce((sum, r) => sum + r.analysis.healthScore, 0) / total 
    : 0;
  
  const severityCounts = results.reduce((acc, r) => {
    const severity = r.analysis.severity;
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});
  
  return {
    total,
    staleCount,
    enabledCount,
    hasTimestampsCount,
    avgHealthScore: Math.round(avgHealthScore),
    severityBreakdown: severityCounts,
    protocols: results,
    summary: {
      overallStatus: staleCount === 0 ? 'healthy' : staleCount > total / 2 ? 'critical' : 'warning',
      needsAttention: results.filter(r => r.analysis.isStale || !r.analysis.hasTimestamps)
    }
  };
}

module.exports = {
  analyzeFreshness,
  checkStaleness,
  calculateFreshnessScore,
  extractTimestamps,
  assignSeverity,
  analyzeMultipleProtocols,
  daysBetween
};