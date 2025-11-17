import { useEffect, useMemo, useState } from 'react'
import Card from '../components/common/Card.jsx'
import Button from '../components/common/Button.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import ErrorDisplay from '../components/common/ErrorDisplay.jsx'
import LoadingState from '../components/common/LoadingState.jsx'
import ProtocolFilter from '../components/insights/ProtocolFilter.jsx'
import CoverageGapBrowser from '../components/insights/CoverageGapBrowser.jsx'
import CoverageGapDetail from '../components/insights/CoverageGapDetail.jsx'
import { useCoverageGaps } from '../hooks/useCoverageGaps.js'
import { buildFilterOptions, severityRank } from '../utils/insightsTransforms.js'

const sortOptions = [
  { value: 'severity', label: 'Severity' },
  { value: 'coverage', label: 'Coverage' },
  { value: 'name', label: 'Name' },
]

const CoverageGaps = () => {
  const { data, loading, error, refetch } = useCoverageGaps()
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('severity')
  const [sortOrder, setSortOrder] = useState('asc')
  const [selectedId, setSelectedId] = useState(null)

  const gaps = data?.gaps ?? []

  const filtered = useMemo(() => {
    const lowerQuery = searchTerm.trim().toLowerCase()
    const matchesSearch = (gap) => {
      if (!lowerQuery) return true
      return (
        gap.protocolName.toLowerCase().includes(lowerQuery) ||
        gap.reference.toLowerCase().includes(lowerQuery) ||
        gap.gapType.toLowerCase().includes(lowerQuery)
      )
    }

    const matchesType = (gap) => typeFilter === 'all' || gap.type === typeFilter

    const comparator = (a, b) => {
      switch (sortKey) {
        case 'coverage': {
          const valueA = Number.isFinite(a.coveragePercentage) ? a.coveragePercentage : -1
          const valueB = Number.isFinite(b.coveragePercentage) ? b.coveragePercentage : -1
          return valueA - valueB
        }
        case 'name':
          return a.protocolName.localeCompare(b.protocolName)
        case 'severity':
        default:
          return severityRank(a.severity) - severityRank(b.severity)
      }
    }

    const result = gaps.filter(matchesType).filter(matchesSearch).sort(comparator)
    if (sortOrder === 'desc') {
      result.reverse()
    }
    return result
  }, [gaps, searchTerm, typeFilter, sortKey, sortOrder])

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filtered.find((gap) => gap.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const selectedGap = filtered.find((gap) => gap.id === selectedId) ?? null
  const filterOptions = useMemo(
    () => buildFilterOptions(data?.stats?.typeCounts ?? {}, data?.stats?.totalGaps ?? 0),
    [data],
  )

  return (
    <div className="stack">
      <Card
        title="Coverage Gaps"
        subtitle="Artifacts missing documentation"
        actions={
          <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
            Refresh
          </Button>
        }
      >
        {loading ? (
          <LoadingState
            variant="skeleton"
            label="Loading coverage gaps"
            description="Analyzing coverage metrics..."
            fullWidth
          />
        ) : error ? (
          <ErrorDisplay
            title="Unable to load coverage data"
            message="We couldn't retrieve the coverage gaps."
            error={error}
            onRetry={refetch}
          />
        ) : !gaps.length ? (
          <EmptyState
            title="No coverage gaps detected"
            description="Documentation covers all monitored references."
            action={
              <Button variant="ghost" size="sm" onClick={refetch}>
                Refresh data
              </Button>
            }
          />
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
                    placeholder="Search by protocol, reference, or gap"
                    aria-label="Search coverage gaps"
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
              {data?.stats?.totalGaps ?? 0} coverage gaps detected in the latest run.
            </p>

            <CoverageGapBrowser gaps={filtered} selectedId={selectedId} onSelect={setSelectedId} />
          </>
        )}
      </Card>

      <Card title="Gap Detail" subtitle="Missing artifacts & remediation plan">
        <CoverageGapDetail gap={selectedGap} />
      </Card>
    </div>
  )
}

export default CoverageGaps
