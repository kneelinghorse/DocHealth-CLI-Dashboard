import { useCallback, useEffect, useState } from 'react'
import { fetchCurrentHealth } from '../api/healthClient.js'
import { buildStaleDocInsights } from '../utils/insightsTransforms.js'

export const useStaleDocs = () => {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  const load = useCallback(
    async ({ signal } = {}) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const run = await fetchCurrentHealth({ signal })
        setState({ data: buildStaleDocInsights(run ?? null), loading: false, error: null })
      } catch (error) {
        if (error?.name === 'AbortError') {
          return
        }
        setState({ data: null, loading: false, error })
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    load({ signal: controller.signal })
    return () => controller.abort()
  }, [load])

  const refetch = useCallback(() => {
    load()
  }, [load])

  return { ...state, refetch }
}
