import Card from '../common/Card.jsx'
import Button from '../common/Button.jsx'
import EmptyState from '../common/EmptyState.jsx'
import ErrorDisplay from '../common/ErrorDisplay.jsx'
import LoadingState from '../common/LoadingState.jsx'
import StatusIndicator from './StatusIndicator.jsx'

const formatTimestamp = (value) => {
  if (!value) return 'No runs recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown timestamp' : date.toLocaleString()
}

const formatMetricValue = (value, suffix = '') => {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'number' && suffix === '%') {
    return `${value}%`
  }
  return value
}

const HealthScoreDashboard = ({ data, loading, error, onRefresh }) => {
  const actions = onRefresh ? (
    <Button variant="ghost" size="sm" onClick={onRefresh}>
      Refresh
    </Button>
  ) : null

  if (loading) {
    return (
      <Card title="Documentation Health" subtitle="Latest CLI analysis run" actions={actions}>
        <LoadingState
          variant="skeleton"
          label="Loading health score"
          description="Fetching the latest CLI run."
          fullWidth
        />
      </Card>
    )
  }

  if (error) {
    return (
      <Card title="Documentation Health" subtitle="Latest CLI analysis run" actions={actions}>
        <ErrorDisplay
          title="Unable to load health score"
          message="We couldn't retrieve the current run."
          error={error}
          onRetry={onRefresh}
        />
      </Card>
    )
  }

  if (!data) {
    return (
      <Card title="Documentation Health" subtitle="Latest CLI analysis run" actions={actions}>
        <EmptyState
          title="No health runs yet"
          description="Run `dochealth check --persist` to publish a baseline."
          action={
            onRefresh ? (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                Check again
              </Button>
            ) : null
          }
        />
      </Card>
    )
  }

  const { score, grade, status, metrics, updatedAt } = data
  const metricEntries = [
    { label: 'Protocols', value: metrics?.totalProtocols },
    { label: 'Stale protocols', value: metrics?.staleProtocols },
    { label: 'Freshness', value: metrics?.averageFreshness, suffix: '%' },
    { label: 'Coverage', value: metrics?.averageCoverage, suffix: '%' },
    { label: 'Validation', value: metrics?.validationScore, suffix: '%' },
  ]

  return (
    <Card title="Documentation Health" subtitle="Latest CLI analysis run" actions={actions}>
      <div className="health-score">
        <div className="health-score__value">
          <span className="health-score__score">{score ?? '—'}</span>
          <div>
            <p className="health-score__label">Health Score</p>
            <p className="subdued">Grade {grade}</p>
          </div>
        </div>
        <StatusIndicator tone={status?.tone} label={status?.label} description={status?.description} />
      </div>

      <dl className="metric-grid">
        {metricEntries.map((metric) => (
          <div key={metric.label} className="metric-grid__item">
            <dt>{metric.label}</dt>
            <dd>{formatMetricValue(metric.value, metric.suffix)}</dd>
          </div>
        ))}
      </dl>

      <p className="subdued">Last run: {formatTimestamp(updatedAt)}</p>
    </Card>
  )
}

export default HealthScoreDashboard
