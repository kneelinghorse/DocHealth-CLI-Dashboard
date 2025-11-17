import Button from './Button.jsx'

const ErrorDisplay = ({
  title = 'Something went wrong',
  message = 'We were unable to load this section.',
  error = null,
  details = null,
  onRetry,
  actionLabel = 'Try again',
  className = '',
}) => {
  const resolvedDetails = details ?? error?.message ?? null

  const classes = ['error-display', className].filter(Boolean).join(' ')

  return (
    <div className={classes} role="alert" aria-live="assertive">
      <div className="error-display__icon" aria-hidden="true">
        !
      </div>
      <div className="error-display__content">
        <p className="error-display__title">{title}</p>
        <p className="error-display__message">{message}</p>
        {resolvedDetails ? <p className="error-display__details">{resolvedDetails}</p> : null}
      </div>
      {onRetry ? (
        <div className="error-display__action">
          <Button variant="ghost" size="sm" onClick={onRetry}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default ErrorDisplay
