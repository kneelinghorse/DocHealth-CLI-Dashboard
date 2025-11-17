const defaultSkeletonWidths = [85, 70, 95, 60, 80]

const LoadingState = ({
  variant = 'spinner',
  label = 'Loading data',
  description = 'Fetching the latest results...',
  lines = 3,
  fullWidth = false,
  className = '',
  ariaLive = 'polite',
}) => {
  const classes = [
    'loading-state',
    `loading-state--${variant}`,
    fullWidth && 'loading-state--full',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const skeletonLines = Array.from({ length: Math.max(1, lines) }).map((_, index) => {
    const width = defaultSkeletonWidths[index % defaultSkeletonWidths.length]
    return width
  })

  return (
    <div className={classes} role="status" aria-live={ariaLive}>
      {variant === 'spinner' ? (
        <span className="loading-state__spinner" aria-hidden="true" />
      ) : (
        <div className="loading-state__skeleton" aria-hidden="true">
          {skeletonLines.map((width, index) => (
            <span
              key={`loading-line-${index}`}
              className="loading-state__skeleton-row"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      )}
      <div className="loading-state__copy">
        <p className="loading-state__label">{label}</p>
        {description ? <p className="loading-state__description">{description}</p> : null}
      </div>
    </div>
  )
}

export default LoadingState
