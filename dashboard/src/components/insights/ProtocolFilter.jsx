const ProtocolFilter = ({ label = 'Protocol types', value = 'all', options = [], onChange }) => {
  const entries = options.length
    ? options
    : [
        {
          value: 'all',
          label: 'All',
        },
      ]

  return (
    <div className="protocol-filter">
      <p className="protocol-filter__label">{label}</p>
      <div className="protocol-filter__options" role="group" aria-label={label}>
        {entries.map((option) => {
          const isActive = option.value === value
          return (
            <button
              type="button"
              key={option.value}
              className={`protocol-filter__option${isActive ? ' is-active' : ''}`}
              aria-pressed={isActive}
              onClick={() => onChange?.(option.value)}
            >
              <span>{option.label}</span>
              {typeof option.count === 'number' ? (
                <span className="protocol-filter__count">{option.count}</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ProtocolFilter
