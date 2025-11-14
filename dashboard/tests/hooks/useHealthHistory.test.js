import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useHealthHistory } from '../../src/hooks/useHealthHistory.js'
import * as healthClient from '../../src/api/healthClient.js'

const fetchHealthHistory = vi.spyOn(healthClient, 'fetchHealthHistory')

describe('useHealthHistory', () => {
  beforeEach(() => {
    fetchHealthHistory.mockReset()
  })

  afterAll(() => {
    fetchHealthHistory.mockRestore()
  })

  test('loads history series', async () => {
    fetchHealthHistory.mockResolvedValue({
      window: { days: 14 },
      runs: [
        { run_timestamp: 1_700_000_000, overall_health_score: 80 },
        { run_timestamp: 1_700_086_400, overall_health_score: 84 },
      ],
    })

    const { result } = renderHook(() => useHealthHistory({ days: 14 }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data.window.days).toBe(14)
    expect(result.current.data.series[0].data).toHaveLength(2)
  })

  test('handles history errors', async () => {
    fetchHealthHistory.mockRejectedValue(new Error('history down'))
    const { result } = renderHook(() => useHealthHistory())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})
