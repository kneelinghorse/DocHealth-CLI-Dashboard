const COMMENT_IDENTIFIER = '<!-- dochealth-pr-health -->';

const SEVERITY_EMOJI = {
  critical: '🟥',
  high: '🟧',
  medium: '🟨',
  low: '🟩'
};

function formatDelta(value) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '0';
}

function truncateSha(sha) {
  return sha ? sha.slice(0, 7) : 'unknown';
}

function formatIssue(issue, options = {}) {
  const emoji = SEVERITY_EMOJI[issue.severity] || '⚠️';
  const prefix = options.resolved ? '✅' : emoji;
  return `${prefix} **${issue.protocolId || 'unknown'}** · ${issue.description}`;
}

function buildSeverityTable(severityDelta) {
  const header = '| Severity | Before | After | Δ |\n| --- | --- | --- | --- |\n';
  const rows = Object.entries(severityDelta)
    .map(([severity, data]) => `| ${severity} | ${data.before} | ${data.after} | ${formatDelta(data.delta)} |`)
    .join('\n');
  return `${header}${rows}`;
}

function formatPRComment(delta, options = {}) {
  const identifier = options.identifier || COMMENT_IDENTIFIER;
  const prNumber = options.prNumber;
  const repo = options.repo;
  const baseSha = truncateSha(options.baseSha);
  const headSha = truncateSha(options.headSha);

  const severityDelta = delta.issues.severity;
  const criticalDelta = severityDelta.critical?.delta || 0;
  const scoreChange = Math.round(delta.scoreChange);

  const statusEmoji = scoreChange > 0 ? '📈' : scoreChange < 0 ? '📉' : '➖';
  const summaryLine = `${statusEmoji} Health score ${scoreChange === 0 ? 'held steady' : scoreChange > 0 ? `improved by ${formatDelta(scoreChange)}` : `dropped by ${formatDelta(scoreChange)}`}.`;

  let body = `## 📊 DocHealth Health Delta for ${repo}#${prNumber}\n\n`;
  body += `${summaryLine}\n\n`;
  body += '| Metric | Before | After | Δ |\n';
  body += '| --- | --- | --- | --- |\n';
  body += `| Health Score | ${delta.beforeScore} | ${delta.afterScore} | ${formatDelta(scoreChange)} |\n`;
  body += `| Critical Issues | ${severityDelta.critical.before} | ${severityDelta.critical.after} | ${formatDelta(criticalDelta)} |\n`;
  body += `| High Issues | ${severityDelta.high.before} | ${severityDelta.high.after} | ${formatDelta(severityDelta.high.delta)} |\n`;
  body += `| Medium Issues | ${severityDelta.medium.before} | ${severityDelta.medium.after} | ${formatDelta(severityDelta.medium.delta)} |\n`;
  body += `| Low Issues | ${severityDelta.low.before} | ${severityDelta.low.after} | ${formatDelta(severityDelta.low.delta)} |\n`;
  body += `| Total Issues | ${delta.issues.beforeTotal} | ${delta.issues.afterTotal} | ${formatDelta(delta.issues.afterTotal - delta.issues.beforeTotal)} |\n`;

  if (delta.issues.newIssues.length) {
    body += '\n**New Issues**\n';
    delta.issues.newIssues.slice(0, 5).forEach(issue => {
      body += `- ${formatIssue(issue)}\n`;
    });
    if (delta.issues.newIssues.length > 5) {
      body += `- … ${delta.issues.newIssues.length - 5} more\n`;
    }
  }

  if (delta.issues.resolvedIssues.length) {
    body += '\n**Resolved Issues**\n';
    delta.issues.resolvedIssues.slice(0, 5).forEach(issue => {
      body += `- ${formatIssue(issue, { resolved: true })}\n`;
    });
    if (delta.issues.resolvedIssues.length > 5) {
      body += `- … ${delta.issues.resolvedIssues.length - 5} more\n`;
    }
  }

  const remainingIssues = delta.issues.remaining.slice(0, 5);

  body += '\n<details>\n<summary>Detailed Health Report</summary>\n\n';
  body += `**Base ➡️ Head:** ${baseSha} → ${headSha}\n\n`;
  body += buildSeverityTable(severityDelta);
  body += '\n\n';
  if (remainingIssues.length) {
    body += '**Open Issues**\n';
    remainingIssues.forEach(issue => {
      body += `- ${formatIssue(issue)}\n`;
    });
    if (delta.issues.remaining.length > remainingIssues.length) {
      body += `- … ${delta.issues.remaining.length - remainingIssues.length} more\n`;
    }
    body += '\n';
  }
  if (delta.beforeTimestamp || delta.afterTimestamp) {
    body += `Generated from reports at ${delta.beforeTimestamp || 'unknown'} → ${delta.afterTimestamp || 'unknown'}.\n\n`;
  }
  body += '</details>\n\n';
  body += identifier;

  return body;
}

module.exports = {
  COMMENT_IDENTIFIER,
  formatPRComment
};
