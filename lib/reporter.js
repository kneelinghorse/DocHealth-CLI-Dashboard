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

  // Mission M2.3: Enhanced scoring with validation (40% freshness, 40% coverage, 20% validation)
  const freshnessScore = analysisResults.avgFreshnessScore / 100;
  const coverageScore = analysisResults.avgCoverageScore / 100;
  
  // Calculate validation score from URN validation results
  const urnValidation = analysisResults.urnValidation || {};
  const totalUrns = urnValidation.total || 0;
  const validUrns = urnValidation.valid || 0;
  const brokenUrns = urnValidation.broken || 0;
  const invalidUrns = urnValidation.invalid || 0;
  
  // Validation score: percentage of valid URNs (0-1 scale)
  const validationScore = totalUrns > 0 ? validUrns / totalUrns : 1;
  
  // Calculate weighted score with new weights
  const freshnessWeight = 0.4;
  const coverageWeight = 0.4;
  const validationWeight = 0.2;
  
  const overallScore = Math.round(
    (freshnessScore * freshnessWeight +
     coverageScore * coverageWeight +
     validationScore * validationWeight) * 100
  );
  
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
        score: analysisResults.avgFreshnessScore,
        weight: freshnessWeight,
        contribution: Math.round(freshnessScore * freshnessWeight * 100)
      },
      coverage: {
        score: analysisResults.avgCoverageScore,
        weight: coverageWeight,
        contribution: Math.round(coverageScore * coverageWeight * 100)
      },
      validation: {
        score: Math.round(validationScore * 100),
        weight: validationWeight,
        contribution: Math.round(validationScore * validationWeight * 100)
      }
    },
    metrics: {
      totalProtocols: analysisResults.total,
      staleProtocols: analysisResults.staleCount,
      enabledProtocols: analysisResults.enabledCount,
      protocolsWithTimestamps: analysisResults.hasTimestampsCount,
      severityBreakdown: analysisResults.severityBreakdown,
      coverage: {
        totalItems: analysisResults.coverageSummary?.totalItems || 0,
        documentedItems: analysisResults.coverageSummary?.documentedItems || 0,
        overallCoveragePercentage: analysisResults.coverageSummary?.coveragePercentage || 0
      },
      urns: {
        total: totalUrns,
        valid: validUrns,
        broken: brokenUrns,
        invalid: invalidUrns,
        validationScore: Math.round(validationScore * 100),
        validationFailures: brokenUrns + invalidUrns
      }
    },
    notes: 'Mission M2.3: Score based on 40% freshness, 40% coverage, 20% validation.'
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
  const { urnValidation = {} } = analysisResults;
  
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
  report += `  With Timestamps: ${healthScore.metrics.protocolsWithTimestamps}\n`;
  
  // Coverage metrics
  if (healthScore.metrics.coverage) {
    const coverage = healthScore.metrics.coverage;
    const coverageColor = coverage.overallCoveragePercentage >= 80 ? c.green :
                         coverage.overallCoveragePercentage >= 60 ? c.yellow : c.red;
    report += `  Coverage: ${coverageColor(`${coverage.overallCoveragePercentage}%`)} ` +
              `(${coverage.documentedItems}/${coverage.totalItems} items documented)\n`;
  }
  
  // URN validation metrics
  if (healthScore.metrics.urns && healthScore.metrics.urns.total > 0) {
    const urns = healthScore.metrics.urns;
    const urnColor = urns.broken === 0 ? c.green : c.red;
    report += `  URNs: ${urnColor(`${urns.valid} valid, ${urns.broken} broken, ${urns.invalid} invalid`)}\n`;
  }
  report += '\n';

  // Score Breakdown
  report += c.bold('Score Breakdown:\n');
  Object.entries(healthScore.breakdown).forEach(([component, data]) => {
    const componentScore = Math.round(data.score * (data.weight || 1));
    report += `  ${component}: ${componentScore}/100 (weight: ${(data.weight * 100).toFixed(0)}%)\n`;
  });
  report += c.gray(`  ${healthScore.notes}\n\n`);

  // Detailed findings if requested
  if (showDetails && analysisResults.protocols) {
    const staleProtocols = analysisResults.protocols.filter(p => p.freshness.isStale);
    const noTimestampProtocols = analysisResults.protocols.filter(p => !p.freshness.hasTimestamps);
    const lowCoverageProtocols = analysisResults.protocols.filter(p => p.coverage.coveragePercentage < 0.5);
    
    if (staleProtocols.length > 0) {
      report += c.bold('Stale Documentation:\n');
      staleProtocols.forEach(p => {
        report += c.yellow(`  ⚠️  ${p.id}: ${p.freshness.daysStale} days stale\n`);
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

    // Broken URNs
    if (urnValidation.broken && urnValidation.broken.length > 0) {
      report += c.bold('Broken URN References:\n');
      urnValidation.broken.forEach(urn => {
        report += c.red(`  ❌ ${urn}\n`);
      });
      report += '\n';
      
      // Show remediation suggestions
      const { generateRemediation } = require('./urn-resolver');
      const remediation = generateRemediation(urnValidation.broken);
      if (remediation.length > 0) {
        report += c.bold('URN Remediation Suggestions:\n');
        remediation.slice(0, 3).forEach(item => {
          report += c.yellow(`  🔗 ${item.urn}:\n`);
          item.suggestions.slice(0, 2).forEach(suggestion => {
            report += `     • ${suggestion}\n`;
          });
        });
        report += '\n';
      }
    }

    if (lowCoverageProtocols.length > 0) {
      report += c.bold('Low Coverage:\n');
      lowCoverageProtocols.forEach(p => {
        const coveragePercent = Math.round(p.coverage.coveragePercentage * 100);
        report += c.yellow(`  ⚠️  ${p.id}: ${coveragePercent}% coverage (${p.coverage.documentedItems}/${p.coverage.totalItems})\n`);
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
    version: '2.0.0',
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
      overallStatus: analysisResults.summary?.overallStatus || 'unknown',
      coverage: analysisResults.coverageSummary || {}
    }
  };

  if (includeDetails && analysisResults.protocols) {
    report.details = {
      protocols: analysisResults.protocols.map(p => ({
        id: p.id,
        type: p.type,
        healthScore: p.combined.healthScore,
        freshness: {
          score: Math.round(p.freshness.freshnessScore * 100),
          isStale: p.freshness.isStale,
          severity: p.freshness.severity,
          daysStale: p.freshness.daysStale,
          hasTimestamps: p.freshness.hasTimestamps,
          enabled: p.freshness.enabled
        },
        coverage: {
          score: Math.round(p.coverage.coverageScore * 100),
          totalItems: p.coverage.totalItems,
          documentedItems: p.coverage.documentedItems,
          coveragePercentage: Math.round(p.coverage.coveragePercentage * 100),
          missingDocumentation: p.coverage.missingDocumentation
        },
        recommendations: p.combined.recommendations
      })),
      severityBreakdown: healthScore.metrics.severityBreakdown
    };
  }

  report.recommendations = generateRecommendations(healthScore, analysisResults);

  return report;
}

/**
 * Generate detailed gap analysis with severity and recommendations
 * @param {Object} healthScore - Health score result
 * @param {Object} analysisResults - Analysis results
 * @returns {Object} - Structured gap analysis
 */
function generateGapAnalysis(healthScore, analysisResults) {
  const gaps = {
    freshness: [],
    coverage: [],
    validation: [],
    timestamp: []
  };

  if (!analysisResults.protocols) {
    return gaps;
  }

  // Freshness gaps
  analysisResults.protocols.forEach(protocol => {
    if (protocol.freshness.isStale || !protocol.freshness.hasTimestamps) {
      const severity = protocol.freshness.severity;
      const gap = {
        protocolId: protocol.id,
        type: protocol.type,
        severity,
        urn: `urn:dochealth:${protocol.type}:${protocol.id}`,
        file: `./src/${protocol.id.replace(/-/g, '_')}_protocol_*.js`,
        issue: protocol.freshness.isStale ?
          `${protocol.freshness.daysStale} days stale` :
          'Missing timestamps',
        daysStale: protocol.freshness.daysStale,
        recommendation: generateFreshnessRecommendation(protocol, severity)
      };
      gaps.freshness.push(gap);
    }
  });

  // Coverage gaps
  analysisResults.protocols.forEach(protocol => {
    if (protocol.coverage.coveragePercentage < 0.8) { // Below 80% coverage
      const severity = protocol.coverage.coveragePercentage < 0.5 ? 'high' :
                      protocol.coverage.coveragePercentage < 0.7 ? 'medium' : 'low';
      const missingCount = protocol.coverage.totalItems - protocol.coverage.documentedItems;
      
      const gap = {
        protocolId: protocol.id,
        type: protocol.type,
        severity,
        urn: `urn:dochealth:${protocol.type}:${protocol.id}`,
        file: `./src/${protocol.id.replace(/-/g, '_')}_protocol_*.js`,
        issue: `${missingCount} items missing documentation`,
        coveragePercentage: Math.round(protocol.coverage.coveragePercentage * 100),
        missingItems: missingCount,
        recommendation: generateCoverageRecommendation(protocol, severity)
      };
      gaps.coverage.push(gap);
    }
  });

  // Validation gaps (URNs)
  if (analysisResults.urnValidation) {
    const { broken = [], invalid = [] } = analysisResults.urnValidation;
    const allInvalid = [...broken, ...invalid];
    
    allInvalid.forEach(urn => {
      const gap = {
        protocolId: extractProtocolIdFromUrn(urn),
        type: extractProtocolTypeFromUrn(urn),
        severity: broken.includes(urn) ? 'high' : 'medium',
        urn,
        file: 'Multiple files',
        issue: broken.includes(urn) ? 'Broken URN reference' : 'Invalid URN format',
        recommendation: generateValidationRecommendation(urn, broken.includes(urn))
      };
      gaps.validation.push(gap);
    });
  }

  // Sort gaps by severity (critical > high > medium > low)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  Object.keys(gaps).forEach(gapType => {
    gaps[gapType].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  });

  return gaps;
}

/**
 * Generate freshness-specific recommendations with dochealth generate commands
 * @param {Object} protocol - Protocol analysis result
 * @param {string} severity - Severity level
 * @returns {string} - Specific recommendation
 */
function generateFreshnessRecommendation(protocol, severity) {
  const baseCommand = `dochealth generate ${protocol.type}`;
  
  switch (severity) {
    case 'critical':
      return `URGENT: Run "${baseCommand}" to auto-generate updated documentation. ${protocol.freshness.daysStale} days critically stale.`;
    case 'high':
      return `Run "${baseCommand}" to refresh outdated documentation. Priority: High.`;
    case 'medium':
      return `Run "${baseCommand}" to update documentation. Priority: Medium.`;
    case 'low':
      return `Consider running "${baseCommand}" to refresh documentation.`;
    default:
      return `Review and update documentation for ${protocol.id}`;
  }
}

/**
 * Generate coverage-specific recommendations with dochealth generate commands
 * @param {Object} protocol - Protocol analysis result
 * @param {string} severity - Severity level
 * @returns {string} - Specific recommendation
 */
function generateCoverageRecommendation(protocol, severity) {
  const baseCommand = `dochealth generate ${protocol.type}`;
  const missingCount = protocol.coverage.totalItems - protocol.coverage.documentedItems;
  
  switch (severity) {
    case 'high':
      return `Run "${baseCommand}" to auto-generate missing documentation for ${missingCount} items. Priority: High.`;
    case 'medium':
      return `Run "${baseCommand}" to add documentation for ${missingCount} missing items.`;
    case 'low':
      return `Run "${baseCommand}" to complete documentation coverage.`;
    default:
      return `Add documentation for missing items in ${protocol.id}`;
  }
}

/**
 * Generate validation-specific recommendations
 * @param {string} urn - URN reference
 * @param {boolean} isBroken - Whether URN is broken
 * @returns {string} - Specific recommendation
 */
function generateValidationRecommendation(urn, isBroken) {
  if (isBroken) {
    return `Fix broken URN reference: ${urn}. Check if target protocol exists or update the reference.`;
  }
  return `Correct URN format: ${urn}. Ensure it follows the urn:dochealth:{type}:{id} pattern.`;
}

/**
 * Extract protocol ID from URN
 * @param {string} urn - URN string
 * @returns {string} - Protocol ID
 */
function extractProtocolIdFromUrn(urn) {
  const match = urn.match(/urn:dochealth:[^:]+:([^:]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Extract protocol type from URN
 * @param {string} urn - URN string
 * @returns {string} - Protocol type
 */
function extractProtocolTypeFromUrn(urn) {
  const match = urn.match(/urn:dochealth:([^:]+):/);
  return match ? match[1] : 'unknown';
}

/**
 * Generate actionable recommendations based on health analysis
 * @param {Object} healthScore - Health score result
 * @param {Object} analysisResults - Analysis results
 * @returns {Array} - List of recommendation strings
 */
function generateRecommendations(healthScore, analysisResults) {
  const recommendations = [];
  const gaps = generateGapAnalysis(healthScore, analysisResults);

  // Score-based recommendations
  if (healthScore.overallScore < 60) {
    recommendations.push('Critical: Immediate documentation updates required');
    recommendations.push('Run "dochealth generate api" to auto-generate API docs');
    recommendations.push('Run "dochealth generate data" to auto-generate data catalog');
    recommendations.push('Run "dochealth generate workflow" to auto-generate workflow docs');
  } else if (healthScore.overallScore < 80) {
    recommendations.push('Warning: Documentation needs attention');
    recommendations.push('Review stale protocols and update documentation');
    recommendations.push('Consider running "dochealth generate" commands for missing docs');
  } else if (healthScore.overallScore < 90) {
    recommendations.push('Good: Documentation is mostly healthy');
    recommendations.push('Address remaining stale protocols to improve score');
  } else {
    recommendations.push('Excellent: Documentation is healthy');
    recommendations.push('Maintain regular updates to keep score high');
  }

  // Add top gap recommendations (up to 3)
  const topGaps = [
    ...gaps.freshness.slice(0, 2),
    ...gaps.coverage.slice(0, 2),
    ...gaps.validation.slice(0, 1)
  ].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  topGaps.slice(0, 3).forEach(gap => {
    recommendations.push(gap.recommendation);
  });

  // Protocol-specific recommendations
  if (analysisResults.protocols) {
    const noTimestamps = analysisResults.protocols.filter(p => !p.freshness.hasTimestamps);
    if (noTimestamps.length > 0) {
      recommendations.push(`Add timestamps to ${noTimestamps.length} protocol(s) for better tracking`);
    }

    const disabled = analysisResults.protocols.filter(p => !p.freshness.enabled);
    if (disabled.length > 0) {
      recommendations.push(`Enable freshness checking for ${disabled.length} disabled protocol(s)`);
    }

    const critical = analysisResults.protocols.filter(p => p.freshness.severity === 'critical');
    if (critical.length > 0) {
      recommendations.push(`URGENT: ${critical.length} protocol(s) are critically stale (>30 days)`);
    }

    const lowCoverage = analysisResults.protocols.filter(p => p.coverage.coveragePercentage < 0.5);
    if (lowCoverage.length > 0) {
      recommendations.push(`${lowCoverage.length} protocol(s) have low coverage (<50%) - add missing documentation`);
    }
  }

  // Coverage-specific recommendations
  if (healthScore.metrics.coverage) {
    const coverage = healthScore.metrics.coverage;
    if (coverage.overallCoveragePercentage < 50) {
      recommendations.push(`Low overall coverage (${coverage.overallCoveragePercentage}%) - prioritize documenting ${coverage.totalItems - coverage.documentedItems} items`);
    } else if (coverage.overallCoveragePercentage < 80) {
      recommendations.push(`Moderate coverage (${coverage.overallCoveragePercentage}%) - continue adding documentation`);
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