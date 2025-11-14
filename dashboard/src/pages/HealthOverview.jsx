import { useMemo } from 'react'
import Card from '../components/common/Card.jsx'
import TrendChart from '../components/charts/TrendChart.jsx'
import ScoreBreakdown from '../components/charts/ScoreBreakdown.jsx'
import HealthScoreDashboard from '../components/health/HealthScoreDashboard.jsx'
import { useHealthScore } from '../hooks/useHealthScore.js'
import { useHealthHistory } from '../hooks/useHealthHistory.js'

const HealthOverview = () => {
  const healthScore = useHealthScore()
  const healthHistory = useHealthHistory()

  const historySubtitle = useMemo(() => {
    const days = healthHistory.data?.window?.days ?? 30
    return `Last ${days}-day window`
  }, [healthHistory.data])

  const handleRefresh = () => {
    healthScore.refetch()
    healthHistory.refetch()
  }

  return (
    <div className="stack">
      <HealthScoreDashboard
        data={healthScore.data}
        loading={healthScore.loading}
        error={healthScore.error}
        onRefresh={handleRefresh}
      />

      <div className="grid">
        <Card title="Health Score Trend" subtitle={historySubtitle}>
          <TrendChart
            series={healthHistory.data?.series ?? []}
            loading={healthHistory.loading}
            error={healthHistory.error}
          />
        </Card>

        <Card title="Score Breakdown" subtitle="Freshness · Coverage · Validation">
          <ScoreBreakdown
            breakdown={healthScore.data?.breakdown}
            loading={healthScore.loading}
            error={healthScore.error}
          />
        </Card>
      </div>
    </div>
  )
}

export default HealthOverview
