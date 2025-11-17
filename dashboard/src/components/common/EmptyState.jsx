const EmptyState = ({
  title = 'Nothing to display',
  description = 'There is no data available for this section yet.',
  icon = null,
  action = null,
  className = '',
  role = 'status',
}) => {
  const classes = ['empty-state', className].filter(Boolean).join(' ')

  return (
    <div className={classes} role={role} aria-live="polite">
      {icon ? (
        <span className="empty-state__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__description">{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  )
}

export default EmptyState
