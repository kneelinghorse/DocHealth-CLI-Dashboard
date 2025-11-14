import { Link } from 'react-router-dom'

const NotFound = () => (
  <div className="empty-state">
    <p className="eyebrow">Navigation</p>
    <h1>Page not found</h1>
    <p className="subdued">
      The requested dashboard section is not available yet. Return home to continue monitoring
      DocHealth metrics.
    </p>
    <Link className="button button--ghost" to="/">
      Go home
    </Link>
  </div>
)

export default NotFound
