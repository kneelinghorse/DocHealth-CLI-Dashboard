import { ResponsiveLine } from '@nivo/line'

const TrendChart = ({ series, loading = false, error = null }) => {
  if (loading) {
    return (
      <div className="chart-panel" role="status" aria-live="polite">
        Loading history…
      </div>
    )
  }

  if (error) {
    return (
      <div className="chart-panel" role="alert">
        Failed to load history: {error.message}
      </div>
    )
  }

  const hasData = Array.isArray(series) && series.some((item) => item.data?.length)
  if (!hasData) {
    return <div className="chart-panel empty-state">No history available yet.</div>
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
