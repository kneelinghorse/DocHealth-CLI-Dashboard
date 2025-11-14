const formatDateTime = (value) => {
  if (!value) return 'Unknown'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString()
}

const StaleDocDetail = ({ item }) => {
  if (!item) {
    return <p className="detail-panel__empty">Select a protocol to view drill-down details.</p>
  }

  return (
    <div className="detail-panel">
      <div className="detail-panel__header">
        <div>
          <p className="eyebrow">Protocol</p>
          <h3 className="detail-panel__title">{item.protocolName}</h3>
          <p className="detail-panel__urn">{item.urn}</p>
        </div>
        <span className={`severity-badge severity-badge--${item.severity}`}>{item.severity}</span>
      </div>

      <dl className="detail-panel__grid">
        <div>
          <dt>Type</dt>
          <dd>{item.typeLabel}</dd>
        </div>
        <div>
          <dt>Days stale</dt>
          <dd>{item.daysStale ?? 'Unknown'}</dd>
        </div>
        <div>
          <dt>Last code change</dt>
          <dd>{formatDateTime(item.lastCodeChange)}</dd>
        </div>
        <div>
          <dt>Last doc update</dt>
          <dd>{formatDateTime(item.lastDocUpdate)}</dd>
        </div>
        <div>
          <dt>Threshold</dt>
          <dd>{item.thresholdDays ? `${item.thresholdDays} days` : 'Default'}</dd>
        </div>
        <div>
          <dt>Health score</dt>
          <dd>{item.score ?? '—'}</dd>
        </div>
      </dl>

      <div className="detail-panel__section">
        <p className="detail-panel__section-title">Status</p>
        <p className="detail-panel__text">{item.status}</p>
        {!item.hasTimestamps ? (
          <p className="detail-panel__warning">Missing timestamps detected — update the protocol manifest.</p>
        ) : null}
      </div>

      {item.recommendations?.length ? (
        <div className="detail-panel__section">
          <p className="detail-panel__section-title">Actionable recommendations</p>
          <ul className="detail-panel__list">
            {item.recommendations.map((rec, index) => (
              <li key={`${item.id}-rec-${index}`}>{rec}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default StaleDocDetail
