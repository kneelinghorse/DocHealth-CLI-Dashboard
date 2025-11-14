import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useHealthScore } from '../../src/hooks/useHealthScore.js'
import * as healthClient from '../../src/api/healthClient.js'

const fetchCurrentHealth = vi.spyOn(healthClient, 'fetchCurrentHealth')

describe('useHealthScore', () => {
  beforeEach(() => {
    fetchCurrentHealth.mockReset()
  })

  afterAll(() => {
    fetchCurrentHealth.mockRestore()
  })

  test('loads and transforms the current run', async () => {
    fetchCurrentHealth.mockResolvedValue({
      runId: 42,
      runTimestamp: 1_700_000_000,
      overallHealthScore: 88,
      protocols: [
        {
          rawAnalysisOutput: {
            freshness: { healthScore: 90, isStale: false },
            coverage: { coveragePercentage: 0.8 },
          },
        },
      ],
    })

    const { result } = renderHook(() => useHealthScore())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data.score).toBe(88)
    expect(result.current.data.metrics.totalProtocols).toBe(1)
    expect(result.current.error).toBeNull()
  })

  test('captures API errors', async () => {
    fetchCurrentHealth.mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useHealthScore())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.data).toBeNull()
  })
})
