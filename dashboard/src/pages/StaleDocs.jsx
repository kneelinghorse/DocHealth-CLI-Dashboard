import Card from '../components/common/Card.jsx'
import Button from '../components/common/Button.jsx'
import { getStaleDocsSnapshot } from '../api/mockClient.js'

const statusColorMap = {
  drift: 'warning',
  warning: 'muted',
}

const StaleDocs = () => {
  const { flagged, staleChains } = getStaleDocsSnapshot()

  return (
    <div className="stack">
      <Card title="Flagged Protocols" subtitle="Docs trailing source of truth">
        <ul className="flagged-list">
          {flagged.map((item) => (
            <li key={item.id}>
              <div>
                <p className="flagged-list__title">{item.title}</p>
                <p className="subdued">Owner: {item.owner}</p>
                <p className="subdued">Last updated {item.lastUpdated}</p>
              </div>
              <div className="flagged-list__actions">
                <span className={`status-pill status-pill--${statusColorMap[item.status] ?? 'muted'}`}>
                  {item.status === 'drift' ? 'Drift detected' : 'Warning'}
                </span>
                <Button variant="ghost" size="sm">
                  View protocol
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Staleness Chains" subtitle="Propagation across linked protocols">
        <div className="grid grid--auto">
          {staleChains.map((chain) => (
            <div key={chain.chain} className="chain-card">
              <p className="chain-card__chain">{chain.chain}</p>
              <p className="chain-card__owner">{chain.owner}</p>
              <p className="chain-card__age">{chain.daysStale} days stale</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default StaleDocs
