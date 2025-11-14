const healthOverview = {
  summary: {
    score: 82,
    freshness: 'Green',
    updatedAt: '2025-02-10T07:30:00Z',
    lastRunDuration: '2m 11s',
  },
  freshnessTrend: [
    {
      id: 'health',
      data: [
        { x: 'Mon', y: 71 },
        { x: 'Tue', y: 74 },
        { x: 'Wed', y: 78 },
        { x: 'Thu', y: 81 },
        { x: 'Fri', y: 82 },
      ],
    },
  ],
  actions: [
    { id: 'api', title: 'Re-run API protocol diff', owner: 'API Team' },
    { id: 'workflow', title: 'Refresh workflow diagrams', owner: 'Workflow Guild' },
    { id: 'semantic', title: 'Validate semantic URN links', owner: 'Docs Platform' },
  ],
}

const staleDocsSnapshot = {
  flagged: [
    {
      id: 'api-01',
      title: 'API Protocol v1.1.1',
      owner: 'API Team',
      status: 'drift',
      lastUpdated: '2025-01-19',
    },
    {
      id: 'workflow-02',
      title: 'Workflow Protocol v1.1.1',
      owner: 'Workflow Guild',
      status: 'warning',
      lastUpdated: '2025-01-12',
    },
  ],
  staleChains: [
    {
      chain: 'Workflow → Semantic → Docs',
      daysStale: 34,
      owner: 'Workflow Guild',
    },
    {
      chain: 'API → Docs',
      daysStale: 21,
      owner: 'API Team',
    },
  ],
}

const coverageGapSummary = {
  coverageStats: {
    documented: 142,
    missing: 18,
    blockers: 3,
    target: 160,
    coverageBar: [
      { domain: 'API', documented: 45, missing: 5 },
      { domain: 'Data', documented: 32, missing: 7 },
      { domain: 'Workflow', documented: 40, missing: 3 },
      { domain: 'Semantic', documented: 25, missing: 3 },
    ],
    criticalGaps: [
      {
        id: 'semantic-urn',
        title: 'Semantic URN cross-links incomplete',
        severity: 'critical',
        owner: 'Docs Platform',
      },
      {
        id: 'data-policy',
        title: 'Data retention policy missing SME review',
        severity: 'warning',
        owner: 'Data Stewards',
      },
    ],
  },
}

const clone = (value) => JSON.parse(JSON.stringify(value))

export const getHealthOverview = () => clone(healthOverview)
export const getStaleDocsSnapshot = () => clone(staleDocsSnapshot)
export const getCoverageGapSummary = () => clone(coverageGapSummary)
