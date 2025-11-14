import { useEffect, useMemo, useState } from 'react'
import Card from '../components/common/Card.jsx'
import Button from '../components/common/Button.jsx'
import ProtocolFilter from '../components/insights/ProtocolFilter.jsx'
import StaleDocsList from '../components/insights/StaleDocsList.jsx'
import StaleDocDetail from '../components/insights/StaleDocDetail.jsx'
import { useStaleDocs } from '../hooks/useStaleDocs.js'
import { buildFilterOptions, severityRank } from '../utils/insightsTransforms.js'

const sortOptions = [
  { value: 'severity', label: 'Severity' },
  { value: 'staleness', label: 'Days stale' },
  { value: 'name', label: 'Name' },
]

const StaleDocs = () => {
  const { data, loading, error, refetch } = useStaleDocs()
  const [selectedId, setSelectedId] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('severity')
  const [sortOrder, setSortOrder] = useState('asc')

  const items = data?.items ?? []

  const filtered = useMemo(() => {
    const lowerQuery = searchTerm.trim().toLowerCase()
    const matchesSearch = (item) => {
      if (!lowerQuery) return true
      return (
        item.protocolName.toLowerCase().includes(lowerQuery) ||
        item.urn.toLowerCase().includes(lowerQuery)
      )
    }

    const matchesType = (item) => typeFilter === 'all' || item.type === typeFilter

    const comparator = (a, b) => {
      switch (sortKey) {
        case 'staleness': {
          const valueA = Number.isFinite(a.daysStale) ? a.daysStale : Number.POSITIVE_INFINITY
          const valueB = Number.isFinite(b.daysStale) ? b.daysStale : Number.POSITIVE_INFINITY
          return valueA - valueB
        }
        case 'name':
          return a.protocolName.localeCompare(b.protocolName)
        case 'severity':
        default:
          return severityRank(a.severity) - severityRank(b.severity)
      }
    }

    const result = items.filter(matchesType).filter(matchesSearch).sort(comparator)
    if (sortOrder === 'desc') {
      result.reverse()
    }
    return result
  }, [items, searchTerm, typeFilter, sortKey, sortOrder])

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filtered.find((item) => item.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const selectedItem = filtered.find((item) => item.id === selectedId) ?? null
  const filterOptions = useMemo(
    () => buildFilterOptions(data?.stats?.typeCounts ?? {}, data?.stats?.staleProtocols ?? 0),
    [data],
  )

  return (
    <div className="stack">
      <Card
        title="Stale Documentation"
        subtitle="Protocols with code → doc drift"
        actions={
          <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
            Refresh
          </Button>
        }
      >
        {loading ? (
          <p role="status">Loading stale protocols…</p>
        ) : error ? (
          <p role="alert">Unable to load stale documentation: {error.message}</p>
        ) : (
          <>
            <div className="insights-toolbar">
              <ProtocolFilter
                label="Protocol types"
                value={typeFilter}
                options={filterOptions}
                onChange={setTypeFilter}
              />
              <div className="insights-toolbar__controls">
                <div className="insights-toolbar__search">
                  <input
                    type="search"
                    placeholder="Search protocols or URNs"
                    aria-label="Search stale protocols"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                  <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        Sort by {option.label}
                      </option>
                    ))}
                  </select>
                  <Button variant="ghost" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                    {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </Button>
                </div>
              </div>
            </div>

            <p className="subdued">
              {data?.stats?.staleProtocols ?? 0} of {data?.stats?.totalProtocols ?? 0} protocols require
              updates.
            </p>

            <StaleDocsList items={filtered} selectedId={selectedId} onSelect={setSelectedId} />
          </>
        )}
      </Card>

      <Card title="Drill-down" subtitle="Protocol timestamps & recommendations">
        <StaleDocDetail item={selectedItem} />
      </Card>
    </div>
  )
}

export default StaleDocs
