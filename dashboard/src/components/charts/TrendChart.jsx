import { ResponsiveLine } from '@nivo/line'
import EmptyState from '../common/EmptyState.jsx'
import ErrorDisplay from '../common/ErrorDisplay.jsx'
import LoadingState from '../common/LoadingState.jsx'

const TrendChart = ({ series, loading = false, error = null }) => {
  if (loading) {
    return (
      <div className="chart-panel">
        <LoadingState
          variant="skeleton"
          label="Loading history"
          description="Fetching recent runs..."
          fullWidth
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="chart-panel">
        <ErrorDisplay
          title="Unable to load history"
          message="We couldn't retrieve the recent runs."
          error={error}
        />
      </div>
    )
  }

  const hasData = Array.isArray(series) && series.some((item) => item.data?.length)
  if (!hasData) {
    return (
      <div className="chart-panel">
        <EmptyState
          title="No history available"
          description="Run dochealth check multiple times to build a trend."
        />
      </div>
    )
  }

  return (
    <div className="chart-panel chart-panel--has-data" role="img" aria-label="Health score trend">
      <ResponsiveLine
        data={series}
        colors={['#22d3ee']}
        margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
        axisBottom={{
          tickSize: 0,
          tickPadding: 12,
          legend: 'Date',
          legendOffset: 32,
          legendPosition: 'middle',
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 12,
          legend: 'Score',
          legendOffset: -30,
          legendPosition: 'middle',
        }}
        pointSize={10}
        pointBorderWidth={2}
        enableGridX={false}
        enableArea
        areaOpacity={0.2}
        useMesh
        theme={{
          textColor: '#cbd5f5',
          axis: { domain: { line: { stroke: '#2e3261' } } },
          grid: { line: { stroke: '#2e3261', strokeDasharray: '2 6' } },
        }}
        yScale={{ min: 0, max: 100 }}
      />
    </div>
  )
}

export default TrendChart
