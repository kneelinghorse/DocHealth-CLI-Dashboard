import { describe, expect, test } from 'vitest'
import {
  buildCoverageGapInsights,
  buildFilterOptions,
  buildStaleDocInsights,
  severityRank,
} from '../../src/utils/insightsTransforms.js'
import { createSampleRun } from '../fixtures/runSamples.js'

describe('insightsTransforms', () => {
  test('buildStaleDocInsights extracts stale protocols with metadata', () => {
    const run = createSampleRun()
    const result = buildStaleDocInsights(run)

    expect(result.items).toHaveLength(2)
    expect(result.stats.staleProtocols).toBe(2)
    expect(result.stats.typeCounts).toEqual({ api: 1, data: 1 })

    const apiEntry = result.items[0]
    expect(apiEntry.protocolName).toBe('API Protocol v1.1.1')
    expect(apiEntry.severity).toBe('high')
    expect(apiEntry.daysStale).toBe(18)
    expect(apiEntry.lastDocUpdate).toBe('2024-12-14T00:00:00Z')
    expect(apiEntry.recommendations).toContain('Update documentation - 18 days stale')
  })

  test('severityRank orders severities from critical to unknown', () => {
    expect(severityRank('critical')).toBeLessThan(severityRank('medium'))
    expect(severityRank('low')).toBeLessThan(severityRank('unknown'))
  })

  test('buildCoverageGapInsights flattens missing documentation entries', () => {
    const run = createSampleRun()
    const result = buildCoverageGapInsights(run)

    expect(result.gaps).toHaveLength(3)
    expect(result.stats.totalGaps).toBe(3)
    expect(result.stats.typeCounts).toEqual({ api: 2, data: 1 })

    const apiGap = result.gaps.find((gap) => gap.protocolName === 'API Protocol v1.1.1')
    expect(apiGap).toBeDefined()
    expect(apiGap.reference).toContain('/users')
    expect(apiGap.gapType).toBe('api-endpoint')
    expect(apiGap.recommendations).toContain('Document 5 endpoints')
  })

  test('buildFilterOptions injects all option entries', () => {
    const options = buildFilterOptions({ api: 2, data: 1 }, 3)
    expect(options).toHaveLength(3)
    expect(options[0]).toMatchObject({ value: 'all', count: 3 })
    expect(options[1]).toMatchObject({ value: 'api', count: 2 })
  })
})
