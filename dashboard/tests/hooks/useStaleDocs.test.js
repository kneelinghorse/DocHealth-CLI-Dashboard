import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStaleDocs } from '../../src/hooks/useStaleDocs.js'
import * as healthClient from '../../src/api/healthClient.js'
import { createSampleRun } from '../fixtures/runSamples.js'

const fetchCurrentHealth = vi.spyOn(healthClient, 'fetchCurrentHealth')

describe('useStaleDocs', () => {
  beforeEach(() => {
    fetchCurrentHealth.mockReset()
  })

  afterAll(() => {
    fetchCurrentHealth.mockRestore()
  })

  test('returns stale documentation insights', async () => {
    fetchCurrentHealth.mockResolvedValue(createSampleRun())
    const { result } = renderHook(() => useStaleDocs())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.data.items).toHaveLength(2)
  })

  test('captures API errors', async () => {
    fetchCurrentHealth.mockRejectedValue(new Error('disconnected'))
    const { result } = renderHook(() => useStaleDocs())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.data).toBeNull()
  })
})
