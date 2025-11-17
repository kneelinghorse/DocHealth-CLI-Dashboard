const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'];

function normalizeSeverity(value) {
  const normalized = String(value || '').toLowerCase();
  return SEVERITY_LEVELS.includes(normalized) ? normalized : 'medium';
}

function getCoverageSeverity(percentage) {
  if (percentage < 50) return 'high';
  if (percentage < 70) return 'medium';
  if (percentage < 80) return 'low';
  return null;
}

function issueId(protocolId, type) {
  return `${type}:${protocolId}`;
}

function extractIssues(report) {
  const protocols = report?.details?.protocols || [];
  const issues = [];

  protocols.forEach(protocol => {
    const protocolId = protocol.id || 'unknown';

    if (protocol.freshness?.isStale) {
      issues.push({
        id: issueId(protocolId, 'freshness'),
        protocolId,
        type: 'freshness',
        severity: normalizeSeverity(protocol.freshness.severity),
        description: `${protocol.freshness.daysStale || 0} days stale`
      });
    }

    if (protocol.freshness && protocol.freshness.hasTimestamps === false) {
      issues.push({
        id: issueId(protocolId, 'timestamp'),
        protocolId,
        type: 'timestamp',
        severity: 'medium',
        description: 'Missing timestamps'
      });
    }

    const coveragePercentage = protocol.coverage?.coveragePercentage;
    if (typeof coveragePercentage === 'number') {
      const severity = getCoverageSeverity(coveragePercentage);
      if (severity) {
        const missingCount = Math.max(0, (protocol.coverage.totalItems || 0) - (protocol.coverage.documentedItems || 0));
        issues.push({
          id: issueId(protocolId, 'coverage'),
          protocolId,
          type: 'coverage',
          severity,
          description: `${coveragePercentage}% coverage (${missingCount} item(s) missing)`
        });
      }
    }
  });

  return issues;
}

function summarizeSeverity(issues) {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  issues.forEach(issue => {
    const severity = normalizeSeverity(issue.severity);
    summary[severity] += 1;
  });

  return summary;
}

function diffIssues(beforeIssues, afterIssues) {
  const beforeMap = new Map(beforeIssues.map(issue => [issue.id, issue]));
  const afterMap = new Map(afterIssues.map(issue => [issue.id, issue]));

  const newIssues = [];
  afterMap.forEach((issue, id) => {
    if (!beforeMap.has(id)) {
      newIssues.push(issue);
    }
  });

  const resolvedIssues = [];
  beforeMap.forEach((issue, id) => {
    if (!afterMap.has(id)) {
      resolvedIssues.push(issue);
    }
  });

  return { newIssues, resolvedIssues };
}

function buildSeverityDelta(beforeSummary, afterSummary) {
  return SEVERITY_LEVELS.reduce((acc, level) => {
    acc[level] = {
      before: beforeSummary[level],
      after: afterSummary[level],
      delta: afterSummary[level] - beforeSummary[level]
    };
    return acc;
  }, {});
}

function calculateHealthDelta(beforeReport = {}, afterReport = {}, context = {}) {
  const beforeScore = Number(beforeReport?.health?.score ?? 0);
  const afterScore = Number(afterReport?.health?.score ?? 0);

  const beforeIssues = extractIssues(beforeReport);
  const afterIssues = extractIssues(afterReport);

  const beforeSeverity = summarizeSeverity(beforeIssues);
  const afterSeverity = summarizeSeverity(afterIssues);
  const severityDelta = buildSeverityDelta(beforeSeverity, afterSeverity);

  const { newIssues, resolvedIssues } = diffIssues(beforeIssues, afterIssues);

  return {
    beforeScore,
    afterScore,
    scoreChange: Number((afterScore - beforeScore).toFixed(2)),
    baseSha: context.baseSha || null,
    headSha: context.headSha || null,
    beforeTimestamp: beforeReport?.timestamp || null,
    afterTimestamp: afterReport?.timestamp || null,
    issues: {
      beforeTotal: beforeIssues.length,
      afterTotal: afterIssues.length,
      severity: severityDelta,
      newIssues,
      resolvedIssues,
      remaining: afterIssues
    }
  };
}

module.exports = {
  calculateHealthDelta,
  extractIssues,
  summarizeSeverity,
  diffIssues
};
