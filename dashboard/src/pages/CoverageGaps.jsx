import Card from '../components/common/Card.jsx'
import Button from '../components/common/Button.jsx'
import CoverageGapsPreview from '../components/charts/CoverageGapsPreview.jsx'
import { getCoverageGapSummary } from '../api/mockClient.js'

const CoverageGaps = () => {
  const { coverageStats } = getCoverageGapSummary()

  return (
    <div className="stack">
      <div className="grid">
        <Card title="Coverage Summary" subtitle="Mission target 160 artifacts">
          <ul className="key-value-list">
            <li>
              <span>Documented</span>
              <strong>{coverageStats.documented}</strong>
            </li>
            <li>
              <span>Missing</span>
              <strong>{coverageStats.missing}</strong>
            </li>
            <li>
              <span>Blockers</span>
              <strong>{coverageStats.blockers}</strong>
            </li>
          </ul>
        </Card>
        <Card
          title="Critical Gaps"
          subtitle="Highest priority items"
          actions={
            <Button variant="ghost" size="sm">
              Export CSV
            </Button>
          }
        >
          <ul className="flagged-list">
            {coverageStats.criticalGaps.map((gap) => (
              <li key={gap.id}>
                <div>
                  <p className="flagged-list__title">{gap.title}</p>
                  <p className="subdued">Owner: {gap.owner}</p>
                </div>
                <span className={`status-pill status-pill--${gap.severity}`}>{gap.severity}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Domain Coverage" subtitle="Documented vs missing artifacts">
        <CoverageGapsPreview data={coverageStats.coverageBar} />
      </Card>
    </div>
  )
}

export default CoverageGaps
