import { Outlet } from 'react-router-dom'
import Button from '../common/Button.jsx'
import Navigation from './Navigation.jsx'

/**
 * AppLayout composes the persistent navigation with routed page content.
 * It keeps the dashboard shell consistent across all pages.
 */
const AppLayout = () => (
  <div className="app-shell">
    <Navigation />
    <main className="app-shell__main">
      <header className="app-shell__header">
        <div>
          <p className="eyebrow">DocHealth Dashboard</p>
          <h1>Documentation Health</h1>
          <p className="subdued">
            Track freshness, coverage, and semantic readiness from a single workspace.
          </p>
        </div>
        <div className="app-shell__header-actions">
          <Button variant="ghost">View Docs</Button>
          <Button>Refresh Data</Button>
        </div>
      </header>
      <section className="app-shell__content">
        <Outlet />
      </section>
    </main>
  </div>
)

export default AppLayout
