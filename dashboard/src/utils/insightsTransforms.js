const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'fresh', 'unknown']

const TYPE_LABELS = {
  api: 'API',
  data: 'Data',
  workflow: 'Workflow',
  docs: 'Docs',
  documentation: 'Docs',
  semantic: 'Semantic',
  unknown: 'Unknown',
}

const inferProtocolTypeFromName = (name = '') => {
  const lower = name.toLowerCase()
  if (lower.includes('api')) return 'api'
  if (lower.includes('data')) return 'data'
  if (lower.includes('workflow')) return 'workflow'
  if (lower.includes('doc')) return 'docs'
  if (lower.includes('semantic')) return 'semantic'
  return 'unknown'
}

const normalizeProtocolType = (rawType, name) => {
  if (!rawType) {
    return inferProtocolTypeFromName(name)
  }
  return String(rawType).toLowerCase()
}

const parseRunTimestamp = (value) => {
  if (!value && value !== 0) {
    return null
  }

  if (typeof value === 'number') {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000
    return new Date(milliseconds)
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const deriveTimestampFromDelta = (runDate, daysAgo) => {
  if (!runDate || !Number.isFinite(daysAgo)) {
    return null
  }

  const copy = new Date(runDate.getTime())
  copy.setUTCDate(copy.getUTCDate() - daysAgo)
  return copy.toISOString()
}

const buildUrn = (type, identifier) => {
  const safeType = type || 'unknown'
  const safeId = identifier || 'unknown'
  return `urn:dochealth:${safeType}:${safeId}`
}

export const severityRank = (value) => {
  const index = SEVERITY_ORDER.indexOf(value)
  return index === -1 ? SEVERITY_ORDER.length : index
}

const summarizeTypes = (items) =>
  items.reduce((acc, item) => {
    const type = item.type || 'unknown'
    acc[type] = (acc[type] ?? 0) + 1
    return acc
  }, {})

const normalizeFreshnessEntry = (protocol, runDate) => {
  const raw = protocol?.rawAnalysisOutput ?? {}
  const freshness = raw.freshness ?? {}
  const combined = raw.combined ?? {}
  const protocolId = raw.id ?? protocol?.protocolName ?? protocol?.snapshotId ?? 'unknown'
  const type = normalizeProtocolType(raw.type, protocol?.protocolName)
  const lastCodeChange =
    freshness.lastCodeChange ?? deriveTimestampFromDelta(runDate, freshness.daysSinceCodeChange)
  const lastDocUpdate =
    freshness.lastDocUpdate ?? deriveTimestampFromDelta(runDate, freshness.daysSinceDocUpdate)

  return {
    id: protocolId,
    protocolName: protocol?.protocolName ?? protocolId,
    filePath: protocol?.filePath ?? null,
    type,
    typeLabel: TYPE_LABELS[type] ?? TYPE_LABELS.unknown,
    severity: freshness.severity ?? 'unknown',
    daysStale: freshness.daysStale ?? null,
    hasTimestamps: freshness.hasTimestamps ?? false,
    isStale: Boolean(freshness.isStale),
    lastCodeChange,
    lastDocUpdate,
    daysSinceCodeChange: freshness.daysSinceCodeChange ?? null,
    daysSinceDocUpdate: freshness.daysSinceDocUpdate ?? null,
    thresholdDays: freshness.thresholdDays ?? null,
    urn: buildUrn(type, protocolId),
    recommendations: combined.recommendations ?? [],
    status: freshness.reason ?? 'Unknown status',
    score: combined.healthScore ?? protocol?.healthScore ?? null,
  }
}

export const buildStaleDocInsights = (run) => {
  const runDate = parseRunTimestamp(run?.runTimestamp)
  const protocols = Array.isArray(run?.protocols) ? run.protocols : []
  const entries = protocols.map((protocol) => normalizeFreshnessEntry(protocol, runDate))
  const staleItems = entries.filter((entry) => entry.isStale || !entry.hasTimestamps)
  staleItems.sort((a, b) => {
    const bySeverity = severityRank(a.severity) - severityRank(b.severity)
    if (bySeverity !== 0) return bySeverity
    const daysA = Number.isFinite(a.daysStale) ? a.daysStale : Infinity
    const daysB = Number.isFinite(b.daysStale) ? b.daysStale : Infinity
    return daysB - daysA
  })

  return {
    items: staleItems,
    stats: {
      totalProtocols: protocols.length,
      staleProtocols: staleItems.length,
      runTimestamp: runDate?.toISOString() ?? null,
      typeCounts: summarizeTypes(staleItems),
    },
  }
}

const gapTypeFromProtocol = (protocolType) => {
  switch (protocolType) {
    case 'api':
      return 'api-endpoint'
    case 'data':
      return 'data-field'
    case 'workflow':
      return 'workflow-step'
    case 'docs':
    case 'documentation':
      return 'docs-section'
    default:
      return 'artifact'
  }
}

const formatReference = (protocolType, gap) => {
  if (protocolType === 'api') {
    const method = gap.method ?? '—'
    const path = gap.path ?? gap.endpoint ?? 'Unknown path'
    return `${method.toUpperCase()} ${path}`.trim()
  }
  if (protocolType === 'data') {
    return gap.fieldName ?? 'Unnamed field'
  }
  if (protocolType === 'workflow') {
    return gap.stepId ?? gap.step ?? 'Unnamed step'
  }
  return gap.title ?? gap.reference ?? 'Artifact'
}

const severityFromCoverage = (percentage) => {
  if (!Number.isFinite(percentage)) {
    return 'unknown'
  }
  if (percentage >= 80) return 'low'
  if (percentage >= 60) return 'medium'
  if (percentage >= 40) return 'high'
  return 'critical'
}

const normalizeCoverageGap = (protocol, runDate) => {
  const raw = protocol?.rawAnalysisOutput ?? {}
  const coverage = raw.coverage ?? {}
  const protocolId = raw.id ?? protocol?.protocolName ?? protocol?.snapshotId ?? 'unknown'
  const type = normalizeProtocolType(raw.type, protocol?.protocolName)
  const percent = Number.isFinite(coverage.coveragePercentage)
    ? Math.round(coverage.coveragePercentage * 100)
    : null
  const baseGapType = gapTypeFromProtocol(type)
  const urn = buildUrn(type, protocolId)
  const missingEntries = Array.isArray(coverage.missingDocumentation)
    ? coverage.missingDocumentation
    : []

  if (!missingEntries.length) {
    return []
  }

  const severity = severityFromCoverage(percent ?? 0)

  return missingEntries.map((gap, index) => {
    const gapId = `${protocolId}-${gap.fieldName ?? gap.stepId ?? gap.path ?? index}`
    const missingFields = Array.isArray(gap.missingFields) ? gap.missingFields : []
    const reference = formatReference(type, gap)
    const issue =
      missingFields.length > 0
        ? `Missing: ${missingFields.join(', ')}`
        : gap.issue ?? 'Coverage gap'

    return {
      id: gapId,
      protocolId,
      protocolName: protocol?.protocolName ?? protocolId,
      type,
      typeLabel: TYPE_LABELS[type] ?? TYPE_LABELS.unknown,
      gapType: gap.gapType ?? baseGapType,
      reference,
      severity,
      coveragePercentage: percent,
      missingFields,
      urn,
      recommendations: coverage.recommendations ?? [],
      issue,
      totalItems: coverage.totalItems ?? null,
      documentedItems: coverage.documentedItems ?? null,
      recordedAt: runDate?.toISOString() ?? null,
    }
  })
}

export const buildCoverageGapInsights = (run) => {
  const runDate = parseRunTimestamp(run?.runTimestamp)
  const protocols = Array.isArray(run?.protocols) ? run.protocols : []
  const gaps = protocols.flatMap((protocol) => normalizeCoverageGap(protocol, runDate))

  gaps.sort((a, b) => {
    const bySeverity = severityRank(a.severity) - severityRank(b.severity)
    if (bySeverity !== 0) return bySeverity
    return (a.coveragePercentage ?? 0) - (b.coveragePercentage ?? 0)
  })

  return {
    gaps,
    stats: {
      totalGaps: gaps.length,
      typeCounts: summarizeTypes(gaps),
      runTimestamp: runDate?.toISOString() ?? null,
    },
  }
}

export const buildFilterOptions = (typeCounts = {}, total = 0) => {
  const entries = Object.entries(typeCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([type, count]) => ({
      value: type,
      label: TYPE_LABELS[type] ?? TYPE_LABELS.unknown,
      count,
    }))

  return [{ value: 'all', label: `All (${total})`, count: total }, ...entries]
}

export { SEVERITY_ORDER, TYPE_LABELS }
