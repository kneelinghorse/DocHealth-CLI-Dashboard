export const createSampleRun = () => ({
  runTimestamp: 1_700_000_000,
  protocols: [
    {
      protocolName: 'API Protocol v1.1.1',
      filePath: 'src/api_protocol_v_1_1_1.js',
      healthScore: 70,
      rawAnalysisOutput: {
        id: 'api-protocol',
        type: 'api',
        freshness: {
          isStale: true,
          severity: 'high',
          daysStale: 18,
          lastCodeChange: '2025-01-01T00:00:00Z',
          lastDocUpdate: '2024-12-14T00:00:00Z',
          daysSinceCodeChange: 45,
          daysSinceDocUpdate: 60,
          hasTimestamps: true,
          thresholdDays: 7,
          reason: 'Documentation outdated',
        },
        coverage: {
          coveragePercentage: 0.5,
          totalItems: 10,
          documentedItems: 5,
          missingDocumentation: [
            { path: '/users', method: 'get', missingFields: ['responses'] },
            { path: '/payments', method: 'post', missingFields: ['description', 'parameters'] },
          ],
          recommendations: ['Document 5 endpoints'],
        },
        combined: {
          healthScore: 60,
          recommendations: ['Update documentation - 18 days stale', 'Document remaining endpoints'],
        },
      },
    },
    {
      protocolName: 'Data Catalog',
      filePath: 'src/data_protocol_v_1_1_1.js',
      healthScore: 65,
      rawAnalysisOutput: {
        id: 'data-catalog',
        type: 'data',
        freshness: {
          isStale: true,
          severity: 'unknown',
          daysStale: null,
          hasTimestamps: false,
          reason: 'Missing timestamps',
        },
        coverage: {
          coveragePercentage: 0.3,
          totalItems: 20,
          documentedItems: 6,
          missingDocumentation: [{ fieldName: 'customer_id', missingFields: ['description'] }],
          recommendations: ['Add descriptions for data fields'],
        },
        combined: {
          healthScore: 40,
          recommendations: ['Add timestamps', 'Improve field documentation'],
        },
      },
    },
  ],
})
