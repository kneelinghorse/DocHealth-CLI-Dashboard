import { ResponsiveBar } from '@nivo/bar'

const shapeBreakdownData = (breakdown = []) =>
  breakdown.map((item) => ({
    label: item.label ?? item.id,
    score: item.score ?? 0,
    weight: item.weight ?? 0,
  }))

const ScoreBreakdown = ({ breakdown, loading = false, error = null }) => {
  if (loading) {
    return (
      <div className="chart-panel" role="status" aria-live="polite">
        Loading breakdown…
      </div>
    )
  }

  if (error) {
    return (
      <div className="chart-panel" role="alert">
        Unable to load breakdown: {error.message}
      </div>
    )
  }

  const data = shapeBreakdownData(breakdown)
  const hasData = data.length && data.every((item) => Number.isFinite(item.score))

  if (!hasData) {
    return <div className="chart-panel empty-state">No breakdown data available.</div>
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
