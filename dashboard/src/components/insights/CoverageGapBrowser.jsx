const formatCoverage = (percentage) => {
  if (percentage === null || percentage === undefined) {
    return 'Unknown'
  }
  return `${percentage}%`
}

const CoverageGapBrowser = ({ gaps = [], selectedId, onSelect }) => {
  if (!gaps.length) {
    return <p className="empty-state">No coverage gaps detected.</p>
  }

  const handleKeyDown = (event, id) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(id)
    }
  }

  return (
    <div className="insights-table-wrapper">
      <table className="insights-table">
        <thead>
          <tr>
            <th scope="col">Protocol</th>
            <th scope="col">Reference</th>
            <th scope="col">Gap type</th>
            <th scope="col">Severity</th>
            <th scope="col">Coverage</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((gap) => {
            const isSelected = gap.id === selectedId
            return (
              <tr
                key={gap.id}
                className={isSelected ? 'is-selected' : ''}
                onClick={() => onSelect?.(gap.id)}
                tabIndex={0}
                onKeyDown={(event) => handleKeyDown(event, gap.id)}
                aria-selected={isSelected}
              >
                <td>
                  <p className="insights-table__primary">{gap.protocolName}</p>
                  <p className="insights-table__secondary">{gap.urn}</p>
                </td>
                <td>{gap.reference}</td>
                <td>
                  <span className="insights-table__chip">{gap.gapType}</span>
                </td>
                <td>
                  <span className={`severity-badge severity-badge--${gap.severity}`}>{gap.severity}</span>
                </td>
                <td>{formatCoverage(gap.coveragePercentage)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default CoverageGapBrowser
