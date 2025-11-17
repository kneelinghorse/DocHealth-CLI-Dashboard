import EmptyState from '../common/EmptyState.jsx'

const CoverageGapDetail = ({ gap }) => {
  if (!gap) {
    return (
      <EmptyState
        title="Select a coverage gap"
        description="Choose a gap from the table to inspect missing documentation."
      />
    )
  }

  return (
    <div className="detail-panel" role="region" aria-live="polite" aria-label="Coverage gap details">
      <div className="detail-panel__header">
        <div>
          <p className="eyebrow">Coverage gap</p>
          <h3 className="detail-panel__title">{gap.protocolName}</h3>
          <p className="detail-panel__urn">{gap.urn}</p>
        </div>
        <span className={`severity-badge severity-badge--${gap.severity}`}>{gap.severity}</span>
      </div>
      <dl className="detail-panel__grid">
        <div>
          <dt>Type</dt>
          <dd>{gap.typeLabel}</dd>
        </div>
        <div>
          <dt>Gap</dt>
          <dd>{gap.gapType}</dd>
        </div>
        <div>
          <dt>Reference</dt>
          <dd>{gap.reference}</dd>
        </div>
        <div>
          <dt>Coverage</dt>
          <dd>{gap.coveragePercentage === null ? 'Unknown' : `${gap.coveragePercentage}%`}</dd>
        </div>
        <div>
          <dt>Documented items</dt>
          <dd>
            {gap.documentedItems ?? '—'} / {gap.totalItems ?? '—'}
          </dd>
        </div>
      </dl>

      <div className="detail-panel__section">
        <p className="detail-panel__section-title">Issue</p>
        <p className="detail-panel__text">{gap.issue}</p>
        {gap.missingFields?.length ? (
          <ul className="detail-panel__list">
            {gap.missingFields.map((field, index) => (
              <li key={`${gap.id}-missing-${index}`}>{field}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {gap.recommendations?.length ? (
        <div className="detail-panel__section">
          <p className="detail-panel__section-title">Recommendations</p>
          <ul className="detail-panel__list">
            {gap.recommendations.map((rec, index) => (
              <li key={`${gap.id}-rec-${index}`}>{rec}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default CoverageGapDetail
