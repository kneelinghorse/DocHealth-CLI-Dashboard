import { ResponsiveBar } from '@nivo/bar'
import EmptyState from '../common/EmptyState.jsx'
import ErrorDisplay from '../common/ErrorDisplay.jsx'
import LoadingState from '../common/LoadingState.jsx'

const shapeBreakdownData = (breakdown = []) =>
  breakdown.map((item) => ({
    label: item.label ?? item.id,
    score: item.score ?? 0,
    weight: item.weight ?? 0,
  }))

const ScoreBreakdown = ({ breakdown, loading = false, error = null }) => {
  if (loading) {
    return (
      <div className="chart-panel">
        <LoadingState
          variant="skeleton"
          label="Loading breakdown"
          description="Gathering score weights..."
          fullWidth
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="chart-panel">
        <ErrorDisplay
          title="Unable to load breakdown"
          message="Score components failed to load."
          error={error}
        />
      </div>
    )
  }

  const data = shapeBreakdownData(breakdown)
  const hasData = data.length && data.every((item) => Number.isFinite(item.score))

  if (!hasData) {
    return (
      <div className="chart-panel">
        <EmptyState
          title="No breakdown data"
          description="Once CLI results are available, we'll show the component scores here."
        />
      </div>
    )
  }

  return (
    <div className="chart-panel chart-panel--has-data" role="img" aria-label="Health score breakdown">
      <ResponsiveBar
        data={data}
        keys={['score']}
        indexBy="label"
        margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
        padding={0.4}
        colors={['#818cf8']}
        minValue={0}
        maxValue={100}
        axisBottom={{
          tickSize: 0,
          tickPadding: 12,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 12,
          legend: 'Score',
          legendOffset: -30,
          legendPosition: 'middle',
        }}
        enableLabel
        labelTextColor="#0f172a"
        theme={{
          textColor: '#cbd5f5',
          axis: { domain: { line: { stroke: '#2e3261' } } },
          grid: { line: { stroke: '#2e3261', strokeDasharray: '2 6' } },
        }}
      />
    </div>
  )
}

export default ScoreBreakdown
