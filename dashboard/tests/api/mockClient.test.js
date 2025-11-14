import { describe, expect, test } from 'vitest'
import {
  getCoverageGapSummary,
  getHealthOverview,
  getStaleDocsSnapshot,
} from '../../src/api/mockClient.js'

describe('mock client', () => {
  test('health overview returns immutable data', () => {
    const first = getHealthOverview()
    const second = getHealthOverview()

    expect(first).not.toBe(second)
    expect(first.summary.score).toBeGreaterThan(0)
    expect(first.freshnessTrend[0].data).toHaveLength(5)
  })

  test('stale doc snapshot exposes flagged items', () => {
    const snapshot = getStaleDocsSnapshot()

    expect(snapshot.flagged.length).toBeGreaterThan(0)
    expect(snapshot.staleChains[0]).toHaveProperty('chain')
  })

  test('coverage gap summary includes chart data', () => {
    const summary = getCoverageGapSummary()

    expect(summary.coverageStats.coverageBar.length).toBeGreaterThan(1)
    expect(summary.coverageStats.criticalGaps[0]).toHaveProperty('severity')
  })
})
