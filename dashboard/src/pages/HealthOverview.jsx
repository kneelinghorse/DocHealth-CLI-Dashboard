import Card from '../components/common/Card.jsx'
import Button from '../components/common/Button.jsx'
import HealthTrendPreview from '../components/charts/HealthTrendPreview.jsx'
import { getHealthOverview } from '../api/mockClient.js'

const HealthOverview = () => {
  const { summary, freshnessTrend, actions } = getHealthOverview()

  return (
    <div className="stack">
      <div className="grid">
        <Card title="Documentation Health Score" subtitle="Live from protocol monitors">
          <div className="stat">
            <span className="stat__value">{summary.score}</span>
            <span className="stat__label">Health Score</span>
          </div>
          <p className="subdued">
            {summary.freshness} · Last sync {new Date(summary.updatedAt).toLocaleString()}
          </p>
        </Card>
        <Card title="Operational Metrics" subtitle="Last pipeline run">
          <ul className="key-value-list">
            <li>
              <span>Freshness window</span>
              <strong>{summary.freshness}</strong>
            </li>
            <li>
              <span>Run duration</span>
              <strong>{summary.lastRunDuration}</strong>
            </li>
            <li>
              <span>Active alerts</span>
              <strong>2</strong>
            </li>
          </ul>
        </Card>
      </div>

      <Card title="Freshness Trend" subtitle="Trailing five-day run">
        <HealthTrendPreview data={freshnessTrend} />
      </Card>

      <Card title="Recommended Actions" subtitle="Routed via SME ownership">
        <ul className="action-list">
          {actions.map((action) => (
            <li key={action.id}>
              <div>
                <p className="action-list__title">{action.title}</p>
                <p className="subdued">Owner: {action.owner}</p>
              </div>
              <Button variant="ghost" size="sm">
                Assign
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

export default HealthOverview
