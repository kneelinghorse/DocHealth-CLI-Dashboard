import { useMemo } from 'react'
import { ROUTES } from '../utils/routes.js'

export const useNavLinks = () =>
  useMemo(
    () => [
      {
        to: ROUTES.health.path,
        label: 'Health Score',
        description: 'Freshness + coverage insights',
      },
      {
        to: ROUTES.staleDocs.path,
        label: 'Stale Docs',
        description: 'Code → protocol drift',
      },
      {
        to: ROUTES.coverage.path,
        label: 'Coverage Gaps',
        description: 'Missing protocol docs',
      },
    ],
    [],
  )
