const toneClass = (tone) => {
  switch (tone) {
    case 'healthy':
      return 'status-indicator--healthy'
    case 'warning':
      return 'status-indicator--warning'
    case 'critical':
      return 'status-indicator--critical'
    default:
      return 'status-indicator--muted'
  }
}

const StatusIndicator = ({ label, description, tone = 'muted' }) => (
  <div className={`status-indicator ${toneClass(tone)}`} role="status" aria-live="polite">
    <span className="status-indicator__dot" aria-hidden="true" />
    <div>
      <p className="status-indicator__label">{label ?? 'Unknown'}</p>
      {description ? <p className="status-indicator__description">{description}</p> : null}
    </div>
  </div>
)

export default StatusIndicator
