/**
 * Unit tests for lib/reporter.js
 */

const { test } = require('node:test');
const assert = require('node:assert');
const {
  calculateHealthScore,
  generateCLIReport,
  generateJSONReport,
  generateRecommendations,
  getExitCode
} = require('../../lib/reporter');

// Mock analysis results for testing
const mockAnalysisResults = {
  total: 3,
  staleCount: 1,
  enabledCount: 3,
  hasTimestampsCount: 2,
  avgHealthScore: 75,
  severityBreakdown: {
    fresh: 1,
    low: 1,
    medium: 0,
    high: 0,
    critical: 1
  },
  protocols: [
    {
      id: 'api-protocol',
      analysis: {
        healthScore: 95,
        isStale: false,
        severity: 'fresh',
        daysStale: 0,
        hasTimestamps: true,
        enabled: true,
        recommendations: ['Documentation up to date']
      }
    },
    {
      id: 'data-protocol',
      analysis: {
        healthScore: 85,
        isStale: false,
        severity: 'low',
        daysStale: 3,
        hasTimestamps: true,
        enabled: true,
        recommendations: ['Within threshold']
      }
    },
    {
      id: 'workflow-protocol',
      analysis: {
        healthScore: 45,
        isStale: true,
        severity: 'critical',
        daysStale: 45,
        hasTimestamps: false,
        enabled: true,
        recommendations: ['Missing timestamps', 'Update documentation']
      }
    }
  ],
  summary: {
    overallStatus: 'warning',
    needsAttention: [
      { id: 'workflow-protocol', analysis: { isStale: true } }
    ]
  }
};

test('calculateHealthScore - should calculate score from analysis results', () => {
  const healthScore = calculateHealthScore(mockAnalysisResults);
  
  assert.strictEqual(typeof healthScore.overallScore, 'number');
  assert.strictEqual(healthScore.maxPossibleScore, 100);
  assert.ok(healthScore.overallScore >= 0 && healthScore.overallScore <= 100);
  assert.ok(['A', 'B', 'C', 'D', 'F'].includes(healthScore.grade));
  assert.ok(healthScore.breakdown.freshness, 'Should have freshness breakdown');
  assert.ok(healthScore.metrics, 'Should have metrics');
});

test('calculateHealthScore - should handle empty results', () => {
  const healthScore = calculateHealthScore({ total: 0 });
  
  assert.strictEqual(healthScore.overallScore, 0);
  assert.strictEqual(healthScore.notes, 'No protocols analyzed');
});

test('calculateHealthScore - should handle missing analysis results', () => {
  const healthScore = calculateHealthScore(null);
  
  assert.strictEqual(healthScore.overallScore, 0);
  assert.strictEqual(healthScore.notes, 'No protocols analyzed');
});

test('generateCLIReport - should generate formatted CLI report', () => {
  const healthScore = calculateHealthScore(mockAnalysisResults);
  const report = generateCLIReport(healthScore, mockAnalysisResults);
  
  assert.strictEqual(typeof report, 'string');
  assert.ok(report.includes('Documentation Health Report'));
  assert.ok(report.includes('Overall Health Score:'));
  assert.ok(report.includes('Metrics Summary:'));
  assert.ok(report.includes('Score Breakdown:'));
  assert.ok(report.includes('Recommendations:'));
});

test('generateCLIReport - should generate report without color when disabled', () => {
  const healthScore = calculateHealthScore(mockAnalysisResults);
  const report = generateCLIReport(healthScore, mockAnalysisResults, { color: false });
  
  assert.strictEqual(typeof report, 'string');
  // Should not contain chalk color codes when color is disabled
  assert.ok(!report.includes('\x1b['));
});

test('generateCLIReport - should generate report without details when disabled', () => {
  const healthScore = calculateHealthScore(mockAnalysisResults);
  const report = generateCLIReport(healthScore, mockAnalysisResults, { showDetails: false });
  
  assert.strictEqual(typeof report, 'string');
  // Should not contain detailed sections when showDetails is false
  assert.ok(!report.includes('Stale Documentation:'));
  assert.ok(!report.includes('Missing Timestamps:'));
});

test('generateJSONReport - should generate structured JSON report', () => {
  const healthScore = calculateHealthScore(mockAnalysisResults);
  const report = generateJSONReport(healthScore, mockAnalysisResults);
  
  assert.strictEqual(typeof report, 'object');
  assert.strictEqual(report.version, '1.0.0');
  assert.ok(report.timestamp);
  assert.ok(report.health);
  assert.strictEqual(report.health.score, healthScore.overallScore);
  assert.ok(report.metrics);
  assert.ok(report.summary);
  assert.ok(report.recommendations);
  assert.ok(Array.isArray(report.recommendations));
});

test('generateJSONReport - should generate report without details when disabled', () => {
  const healthScore = calculateHealthScore(mockAnalysisResults);
  const report = generateJSONReport(healthScore, mockAnalysisResults, { includeDetails: false });
  
  assert.strictEqual(typeof report, 'object');
  assert.ok(!report.details, 'Should not have details section');
  assert.ok(report.recommendations, 'Should still have recommendations');
});

test('generateRecommendations - should generate actionable recommendations', () => {
  const healthScore = calculateHealthScore(mockAnalysisResults);
  const recommendations = generateRecommendations(healthScore, mockAnalysisResults);
  
  assert.ok(Array.isArray(recommendations));
  assert.ok(recommendations.length > 0);
  
  // Should have score-based recommendations
  const hasScoreRec = recommendations.some(r => 
    r.includes('Warning') || r.includes('Critical') || r.includes('Good')
  );
  assert.ok(hasScoreRec, 'Should have score-based recommendations');
  
  // Should have protocol-specific recommendations
  const hasProtocolRec = recommendations.some(r => 
    r.includes('timestamps') || r.includes('protocol')
  );
  assert.ok(hasProtocolRec, 'Should have protocol-specific recommendations');
});

test('generateRecommendations - should generate critical recommendations for low scores', () => {
  const lowScoreResults = {
    ...mockAnalysisResults,
    avgHealthScore: 45
  };
  const healthScore = calculateHealthScore(lowScoreResults);
  const recommendations = generateRecommendations(healthScore, lowScoreResults);
  
  const hasCriticalRec = recommendations.some(r => 
    r.includes('Critical') || r.includes('URGENT')
  );
  assert.ok(hasCriticalRec, 'Should have critical recommendations for low scores');
});

test('generateRecommendations - should generate excellent recommendations for high scores', () => {
  const highScoreResults = {
    ...mockAnalysisResults,
    avgHealthScore: 95,
    staleCount: 0
  };
  const healthScore = calculateHealthScore(highScoreResults);
  const recommendations = generateRecommendations(healthScore, highScoreResults);
  
  const hasExcellentRec = recommendations.some(r => 
    r.includes('Excellent') || r.includes('Maintain')
  );
  assert.ok(hasExcellentRec, 'Should have excellent recommendations for high scores');
});

test('getExitCode - should return 0 for passing scores above threshold', () => {
  const healthScore = { overallScore: 85 };
  const exitCode = getExitCode(healthScore, { threshold: 70 });
  
  assert.strictEqual(exitCode, 0);
});

test('getExitCode - should return 1 for scores below threshold', () => {
  const healthScore = { overallScore: 65 };
  const exitCode = getExitCode(healthScore, { threshold: 70 });
  
  assert.strictEqual(exitCode, 1);
});

test('getExitCode - should return 1 in strict mode with stale protocols', () => {
  const healthScore = { 
    overallScore: 85,
    metrics: { staleProtocols: 2 }
  };
  const exitCode = getExitCode(healthScore, { threshold: 70, strict: true });
  
  assert.strictEqual(exitCode, 1);
});

test('getExitCode - should return 0 in strict mode with no stale protocols', () => {
  const healthScore = { 
    overallScore: 85,
    metrics: { staleProtocols: 0 }
  };
  const exitCode = getExitCode(healthScore, { threshold: 70, strict: true });
  
  assert.strictEqual(exitCode, 0);
});

test('getExitCode - should use default threshold of 70', () => {
  const healthScore = { overallScore: 75 };
  const exitCode = getExitCode(healthScore);
  
  assert.strictEqual(exitCode, 0);
});

test('getExitCode - should pass at exactly threshold', () => {
  const healthScore = { overallScore: 70 };
  const exitCode = getExitCode(healthScore, { threshold: 70 });
  
  assert.strictEqual(exitCode, 0);
});