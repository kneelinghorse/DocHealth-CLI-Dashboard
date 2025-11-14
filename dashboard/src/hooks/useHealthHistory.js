import { useCallback, useEffect, useState } from 'react'
import { fetchHealthHistory } from '../api/healthClient.js'
import { buildTrendSeries } from '../utils/healthTransforms.js'

export const useHealthHistory = ({ days = 30 } = {}) => {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  })

  const load = useCallback(
    async ({ signal } = {}) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const response = await fetchHealthHistory({ days, signal })
        const trend = buildTrendSeries(response?.runs ?? [])
        setState({
          data: {
            ...trend,
            window: response?.window ?? { days },
          },
          loading: false,
          error: null,
        })
      } catch (error) {
        if (error?.name === 'AbortError') {
          return
        }
        setState({
          data: null,
          loading: false,
          error,
        })
      }
    },
    [days],
  )

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal })
    return () => controller.abort()
  }, [load])

  const refetch = useCallback(() => {
    load()
  }, [load])

  return {
    ...state,
    refetch,
  }
}
