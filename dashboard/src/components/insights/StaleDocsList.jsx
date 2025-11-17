import EmptyState from '../common/EmptyState.jsx'

const formatDate = (value) => {
  if (!value) return 'Unknown'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString()
}

const formatDays = (value, hasTimestamps) => {
  if (!hasTimestamps) {
    return 'Missing data'
  }
  if (!Number.isFinite(value)) {
    return 'Unknown'
  }
  if (value === 0) {
    return 'Fresh'
  }
  return `${value}d`
}

const severityClass = (severity) => `severity-badge severity-badge--${severity ?? 'unknown'}`

const StaleDocsList = ({ items = [], selectedId, onSelect }) => {
  if (!items.length) {
    return (
      <EmptyState
        title="No stale protocols match the current filters"
        description="Adjust the filters or search query to see other protocols."
      />
    )
  }

  const handleKeyDown = (event, id) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(id)
    }
  }

  return (
    <div className="insights-table-wrapper" role="region" aria-live="polite" aria-label="Stale protocols results">
      <table className="insights-table">
        <caption className="visually-hidden">Protocols requiring documentation updates</caption>
        <thead>
          <tr>
            <th scope="col">Protocol</th>
            <th scope="col">Type</th>
            <th scope="col">Days stale</th>
            <th scope="col">Severity</th>
            <th scope="col">Last doc update</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isSelected = item.id === selectedId
            return (
              <tr
                key={item.id}
                className={isSelected ? 'is-selected' : ''}
                onClick={() => onSelect?.(item.id)}
                tabIndex={0}
                onKeyDown={(event) => handleKeyDown(event, item.id)}
                aria-selected={isSelected}
              >
                <td>
                  <p className="insights-table__primary">{item.protocolName}</p>
                  <p className="insights-table__secondary">{item.urn}</p>
                </td>
                <td>
                  <span className="insights-table__chip">{item.typeLabel}</span>
                </td>
                <td>{formatDays(item.daysStale, item.hasTimestamps)}</td>
                <td>
                  <span className={severityClass(item.severity)}>{item.severity}</span>
                </td>
                <td>{formatDate(item.lastDocUpdate)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default StaleDocsList
