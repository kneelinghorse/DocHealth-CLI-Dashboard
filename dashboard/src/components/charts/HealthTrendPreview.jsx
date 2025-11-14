import { ResponsiveLine } from '@nivo/line'

const HealthTrendPreview = ({ data }) => (
  <div className="chart-panel" role="img" aria-label="Health score trend">
    <ResponsiveLine
      data={data}
      colors={['#22d3ee']}
      margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
      axisBottom={{
        tickSize: 0,
        tickPadding: 12,
        tickRotation: 0,
        legend: 'Week',
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
    />
  </div>
)

export default HealthTrendPreview
