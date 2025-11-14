import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout.jsx'
import HealthOverview from '../pages/HealthOverview.jsx'
import StaleDocs from '../pages/StaleDocs.jsx'
import CoverageGaps from '../pages/CoverageGaps.jsx'
import NotFound from '../pages/NotFound.jsx'
import { ROUTES } from '../utils/routes.js'

export const createAppRouter = () =>
  createBrowserRouter([
    {
      element: <AppLayout />,
      children: [
        { path: ROUTES.health.path, element: <HealthOverview /> },
        { path: ROUTES.staleDocs.path, element: <StaleDocs /> },
        { path: ROUTES.coverage.path, element: <CoverageGaps /> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ])
