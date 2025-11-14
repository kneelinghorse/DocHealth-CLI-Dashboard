import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCoverageGaps } from '../../src/hooks/useCoverageGaps.js'
import * as healthClient from '../../src/api/healthClient.js'
import { createSampleRun } from '../fixtures/runSamples.js'

const fetchCurrentHealth = vi.spyOn(healthClient, 'fetchCurrentHealth')

describe('useCoverageGaps', () => {
  beforeEach(() => {
    fetchCurrentHealth.mockReset()
  })

  afterAll(() => {
    fetchCurrentHealth.mockRestore()
  })

  test('returns flattened coverage gaps', async () => {
    fetchCurrentHealth.mockResolvedValue(createSampleRun())
    const { result } = renderHook(() => useCoverageGaps())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.data.gaps).toHaveLength(3)
  })

  test('captures API errors', async () => {
    fetchCurrentHealth.mockRejectedValue(new Error('no db'))
    const { result } = renderHook(() => useCoverageGaps())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.data).toBeNull()
  })
})
