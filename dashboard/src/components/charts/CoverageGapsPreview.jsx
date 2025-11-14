import { ResponsiveBar } from '@nivo/bar'

const CoverageGapsPreview = ({ data }) => (
  <div className="chart-panel" role="img" aria-label="Coverage gaps preview">
    <ResponsiveBar
      data={data}
      keys={['documented', 'missing']}
      indexBy="domain"
      margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
      padding={0.4}
      colors={['#34d399', '#f472b6']}
      labelSkipHeight={12}
      labelSkipWidth={12}
      labelTextColor="#0f172a"
      axisBottom={{
        tickSize: 0,
        tickPadding: 12,
        legend: 'Domain',
        legendOffset: 32,
        legendPosition: 'middle',
      }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 12,
        legend: 'Items',
        legendOffset: -35,
        legendPosition: 'middle',
      }}
      theme={{
        textColor: '#cbd5f5',
        axis: { domain: { line: { stroke: '#2e3261' } } },
        grid: { line: { stroke: '#2e3261', strokeDasharray: '2 6' } },
      }}
    />
  </div>
)

export default CoverageGapsPreview
