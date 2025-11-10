/**
 * Health Reporter - Calculate aggregate health scores and generate reports
 */

const chalk = require('chalk');

/**
 * Calculate overall health score from analysis results
 * @param {Object} analysisResults - Results from analyzer.analyzeMultipleProtocols()
 * @returns {Object} - Health score calculation with breakdown
 */
function calculateHealthScore(analysisResults) {
  if (!analysisResults || analysisResults.total === 0) {
    return {
      overallScore: 0,
      maxPossibleScore: 100,
      breakdown: {},
      notes: 'No protocols analyzed'
    };
  }

  // Sprint 1: Score = freshnessScore * 100 (simplified)
  // Future: score = 0.4*fresh + 0.4*coverage + 0.2*validation
  const freshnessScore = analysisResults.avgHealthScore / 100;
  
  // Calculate weighted score (currently 100% freshness)
  const overallScore = Math.round(freshnessScore * 100);
  
  // Determine grade based on score thresholds
  let grade;
  if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 70) grade = 'C';
  else if (overallScore >= 60) grade = 'D';
  else grade = 'F';

  return {
    overallScore,
    maxPossibleScore: 100,
    grade,
    breakdown: {
      freshness: {
        score: analysisResults.avgHealthScore,
        weight: 1.0, // 100% weight in Sprint 1
        contribution: overallScore
      }
      // Future: coverage, validation
    },
    metrics: {
      totalProtocols: analysisResults.total,
      staleProtocols: analysisResults.staleCount,
      enabledProtocols: analysisResults.enabledCount,
      protocolsWithTimestamps: analysisResults.hasTimestampsCount,
      severityBreakdown: analysisResults.severityBreakdown
    },
    notes: 'Sprint 1: Score based 100% on freshness. Future sprints will include coverage and validation.'
  };
}

/**
 * Generate color-coded CLI report
 * @param {Object} healthScore - Result from calculateHealthScore()
 * @param {Object} analysisResults - Raw analysis results
 * @param {Object} options - Report options
 * @returns {string} - Formatted CLI report
 */
function generateCLIReport(healthScore, analysisResults, options = {}) {
  const { showDetails = true, color = true } = options;
  
  // Use chalk if color is enabled
  const c = color ? chalk : {
    green: (s) => s,
    yellow: (s) => s,
    red: (s) => s,
    blue: (s) => s,
    gray: (s) => s,
    bold: (s) => s
  };

  let report = '';
  
  // Header
  report += c.blue('📊 Documentation Health Report\n');
  report += c.gray('=============================\n\n');

  // Overall Score
  const scoreColor = healthScore.overallScore >= 80 ? c.green :
                    healthScore.overallScore >= 60 ? c.yellow : c.red;
  
  report += c.bold('Overall Health Score: ') + 
            scoreColor(`${healthScore.overallScore}/100 `) +
            c.gray(`(Grade: ${healthScore.grade})\n\n`);

  // Status indicator with emoji
  const statusEmoji = healthScore.overallScore >= 80 ? '✅' :
                     healthScore.overallScore >= 60 ? '⚠️' : '❌';
  const statusText = healthScore.overallScore >= 80 ? 'Healthy' :
                    healthScore.overallScore >= 60 ? 'Warning' : 'Critical';
  
  report += `${statusEmoji} Status: ${scoreColor(statusText)}\n\n`;

  // Metrics Summary
  report += c.bold('Metrics Summary:\n');
  report += `  Total Protocols: ${healthScore.metrics.totalProtocols}\n`;
  report += `  Stale Protocols: ${healthScore.metrics.staleProtocols > 0 ? 
            c.red(healthScore.metrics.staleProtocols) : 
            c.green(healthScore.metrics.staleProtocols)}\n`;
  report += `  Enabled Protocols: ${healthScore.metrics.enabledProtocols}\n`;
  report += `  With Timestamps: ${healthScore.metrics.protocolsWithTimestamps}\n\n`;

  // Score Breakdown
  report += c.bold('Score Breakdown:\n');
  Object.entries(healthScore.breakdown).forEach(([component, data]) => {
    const componentScore = Math.round(data.score * (data.weight || 1));
    report += `  ${component}: ${componentScore}/100 (weight: ${(data.weight * 100).toFixed(0)}%)\n`;
  });
  report += c.gray(`  ${healthScore.notes}\n\n`);

  // Detailed findings if requested
  if (showDetails && analysisResults.protocols) {
    const staleProtocols = analysisResults.protocols.filter(p => p.analysis.isStale);
    const noTimestampProtocols = analysisResults.protocols.filter(p => !p.analysis.hasTimestamps);
    
    if (staleProtocols.length > 0) {
      report += c.bold('Stale Documentation:\n');
      staleProtocols.forEach(p => {
        report += c.yellow(`  ⚠️  ${p.id}: ${p.analysis.daysStale} days stale\n`);
      });
      report += '\n';
    }

    if (noTimestampProtocols.length > 0) {
      report += c.bold('Missing Timestamps:\n');
      noTimestampProtocols.forEach(p => {
        report += c.red(`  ❌ ${p.id}: No timestamp data\n`);
      });
      report += '\n';
    }

    // Severity breakdown
    report += c.bold('Severity Distribution:\n');
    Object.entries(healthScore.metrics.severityBreakdown).forEach(([severity, count]) => {
      const severityColor = severity === 'critical' ? c.red :
                           severity === 'high' ? c.red :
                           severity === 'medium' ? c.yellow :
                           severity === 'low' ? c.yellow : c.green;
      report += `  ${severity}: ${severityColor(count)}\n`;
    });
    report += '\n';
  }

  // Recommendations
  const recommendations = generateRecommendations(healthScore, analysisResults);
  if (recommendations.length > 0) {
    report += c.bold('Recommendations:\n');
    recommendations.forEach(rec => {
      report += `  💡 ${rec}\n`;
    });
    report += '\n';
  }

  // Footer
  report += c.gray(`Report generated: ${new Date().toISOString()}\n`);

  return report;
}

/**
 * Generate JSON report for CI/CD integration
 * @param {Object} healthScore - Result from calculateHealthScore()
 * @param {Object} analysisResults - Raw analysis results
 * @param {Object} options - Report options
 * @returns {Object} - Structured JSON report
 */
function generateJSONReport(healthScore, analysisResults, options = {}) {
  const { includeDetails = true } = options;
  
  const report = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    health: {
      score: healthScore.overallScore,
      maxScore: healthScore.maxPossibleScore,
      grade: healthScore.grade,
      status: healthScore.overallScore >= 80 ? 'healthy' :
              healthScore.overallScore >= 60 ? 'warning' : 'critical',
      breakdown: healthScore.breakdown
    },
    metrics: healthScore.metrics,
    summary: {
      totalProtocols: analysisResults.total || 0,
      staleProtocols: analysisResults.staleCount || 0,
      needsAttention: analysisResults.summary?.needsAttention?.length || 0,
      overallStatus: analysisResults.summary?.overallStatus || 'unknown'
    }
  };

  if (includeDetails && analysisResults.protocols) {
    report.details = {
      protocols: analysisResults.protocols.map(p => ({
        id: p.id,
        healthScore: p.analysis.healthScore,
        isStale: p.analysis.isStale,
        severity: p.analysis.severity,
        daysStale: p.analysis.daysStale,
        hasTimestamps: p.analysis.hasTimestamps,
        enabled: p.analysis.enabled,
        recommendations: p.analysis.recommendations
      })),
      severityBreakdown: healthScore.metrics.severityBreakdown
    };
  }

  report.recommendations = generateRecommendations(healthScore, analysisResults);

  return report;
}

/**
 * Generate actionable recommendations based on health analysis
 * @param {Object} healthScore - Health score result
 * @param {Object} analysisResults - Analysis results
 * @returns {Array} - List of recommendation strings
 */
function generateRecommendations(healthScore, analysisResults) {
  const recommendations = [];

  // Score-based recommendations
  if (healthScore.overallScore < 60) {
    recommendations.push('Critical: Immediate documentation updates required');
    recommendations.push('Run "dochealth generate api" to auto-generate API docs');
    recommendations.push('Run "dochealth generate data" to auto-generate data catalog');
  } else if (healthScore.overallScore < 80) {
    recommendations.push('Warning: Documentation needs attention');
    recommendations.push('Review stale protocols and update documentation');
    recommendations.push('Consider running "dochealth generate" for missing docs');
  } else if (healthScore.overallScore < 90) {
    recommendations.push('Good: Documentation is mostly healthy');
    recommendations.push('Address remaining stale protocols to improve score');
  } else {
    recommendations.push('Excellent: Documentation is healthy');
    recommendations.push('Maintain regular updates to keep score high');
  }

  // Protocol-specific recommendations
  if (analysisResults.protocols) {
    const noTimestamps = analysisResults.protocols.filter(p => !p.analysis.hasTimestamps);
    if (noTimestamps.length > 0) {
      recommendations.push(`Add timestamps to ${noTimestamps.length} protocol(s) for better tracking`);
    }

    const disabled = analysisResults.protocols.filter(p => !p.analysis.enabled);
    if (disabled.length > 0) {
      recommendations.push(`Enable freshness checking for ${disabled.length} disabled protocol(s)`);
    }

    const critical = analysisResults.protocols.filter(p => p.analysis.severity === 'critical');
    if (critical.length > 0) {
      recommendations.push(`URGENT: ${critical.length} protocol(s) are critically stale (>30 days)`);
    }
  }

  // General best practices
  if (healthScore.overallScore >= 60) {
    recommendations.push('Set up automated health checks in CI/CD pipeline');
    recommendations.push('Review documentation weekly to maintain freshness');
  }

  return recommendations;
}

/**
 * Determine exit code based on health score and options
 * @param {Object} healthScore - Health score result
 * @param {Object} options - Options including threshold and strict mode
 * @returns {number} - Exit code (0 = success, 1 = failure, 2 = error)
 */
function getExitCode(healthScore, options = {}) {
  const { threshold = 70, strict = false } = options;
  
  if (healthScore.overallScore < threshold) {
    return 1; // Health score below threshold
  }
  
  if (strict && healthScore.metrics.staleProtocols > 0) {
    return 1; // Strict mode: any stale protocols fail
  }
  
  return 0; // Success
}

module.exports = {
  calculateHealthScore,
  generateCLIReport,
  generateJSONReport,
  generateRecommendations,
  getExitCode
};