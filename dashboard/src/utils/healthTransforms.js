const DEFAULT_WEIGHTS = {
  freshness: 0.4,
  coverage: 0.4,
  validation: 0.2,
}

const clampScore = (value, fallback = null) => {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.max(0, Math.min(100, Math.round(value)))
}

const parseTimestamp = (value) => {
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

export const normalizeTimestamp = (value) => {
  const parsed = parseTimestamp(value)
  return parsed ? parsed.toISOString() : null
}

export const gradeFromScore = (score) => {
  if (!Number.isFinite(score)) return 'N/A'
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export const statusFromScore = (score) => {
  if (!Number.isFinite(score)) {
    return { label: 'Unknown', tone: 'muted', description: 'Awaiting data' }
  }

  if (score >= 80) {
    return { label: 'Healthy', tone: 'healthy', description: 'Within operational target' }
  }

  if (score >= 60) {
    return { label: 'Warning', tone: 'warning', description: 'Needs documentation attention' }
  }

  return { label: 'Critical', tone: 'critical', description: 'Docs require immediate action' }
}

const average = (values = []) => {
  if (!values.length) return null
  const total = values.reduce((sum, value) => sum + value, 0)
  return total / values.length
}

const collectValidationScore = (raw) => {
  if (!raw) return null
  if (Number.isFinite(raw.validationScore)) {
    return raw.validationScore
  }
  if (raw.metrics?.urns?.validationScore !== undefined) {
    return raw.metrics.urns.validationScore
  }
  if (raw.urns?.validationScore !== undefined) {
    return raw.urns.validationScore
  }
  if (raw.breakdown?.validation?.score !== undefined) {
    return raw.breakdown.validation.score
  }
  return null
}

const asBreakdownArray = (breakdown) => {
  if (!breakdown) return null
  return [
    {
      id: 'freshness',
      label: 'Freshness',
      score: clampScore(breakdown.freshness?.score),
      weight: breakdown.freshness?.weight ?? DEFAULT_WEIGHTS.freshness,
    },
    {
      id: 'coverage',
      label: 'Coverage',
      score: clampScore(breakdown.coverage?.score),
      weight: breakdown.coverage?.weight ?? DEFAULT_WEIGHTS.coverage,
    },
    {
      id: 'validation',
      label: 'Validation',
      score: clampScore(breakdown.validation?.score),
      weight: breakdown.validation?.weight ?? DEFAULT_WEIGHTS.validation,
    },
  ]
}

export const aggregateBreakdownFromSnapshots = (
  protocols = [],
  { validationFallback = 100 } = {},
) => {
  if (!Array.isArray(protocols) || !protocols.length) {
    return asBreakdownArray({
      freshness: { score: 0 },
      coverage: { score: 0 },
      validation: { score: validationFallback },
    })
  }

  for (const snapshot of protocols) {
    const raw = snapshot?.rawAnalysisOutput
    if (raw?.breakdown) {
      return asBreakdownArray(raw.breakdown)
    }
  }

  const freshnessScores = []
  const coverageScores = []
  const validationScores = []

  protocols.forEach((snapshot) => {
    const raw = snapshot?.rawAnalysisOutput
    if (!raw) return

    if (Number.isFinite(raw.freshness?.healthScore)) {
      freshnessScores.push(raw.freshness.healthScore)
    }

    if (Number.isFinite(raw.coverage?.coveragePercentage)) {
      coverageScores.push(raw.coverage.coveragePercentage * 100)
    } else if (Number.isFinite(raw.coverage?.healthScore)) {
      coverageScores.push(raw.coverage.healthScore)
    }

    const validationScore = collectValidationScore(raw)
    if (Number.isFinite(validationScore)) {
      validationScores.push(validationScore)
    }
  })

  const breakdown = {
    freshness: { score: average(freshnessScores) ?? 0, weight: DEFAULT_WEIGHTS.freshness },
    coverage: { score: average(coverageScores) ?? 0, weight: DEFAULT_WEIGHTS.coverage },
    validation: {
      score: average(validationScores) ?? validationFallback,
      weight: DEFAULT_WEIGHTS.validation,
    },
  }

  return asBreakdownArray(breakdown)
}

const summarizeProtocols = (protocols = []) => {
  if (!Array.isArray(protocols)) {
    return { staleProtocols: 0, healthyProtocols: 0 }
  }

  let staleProtocols = 0
  let healthyProtocols = 0

  protocols.forEach((snapshot) => {
    const raw = snapshot?.rawAnalysisOutput
    if (raw?.freshness?.isStale) {
      staleProtocols += 1
    } else if (raw?.freshness?.isStale === false) {
      healthyProtocols += 1
    }
  })

  return { staleProtocols, healthyProtocols }
}

export const buildRunSummary = (run) => {
  if (!run) return null
  const score = clampScore(run.overallHealthScore ?? run.score ?? 0, 0)
  const grade = gradeFromScore(score)
  const status = statusFromScore(score)
  const updatedAt = normalizeTimestamp(run.runTimestamp)
  const breakdown =
    asBreakdownArray(run.breakdown) ??
    asBreakdownArray(run?.protocols?.[0]?.rawAnalysisOutput?.breakdown) ??
    aggregateBreakdownFromSnapshots(run.protocols)

  const metrics = summarizeProtocols(run.protocols)
  const totalProtocols = run.totalProtocols ?? run.totalProtocolsAnalyzed ?? run.protocols?.length ?? 0

  return {
    id: run.runId ?? run.id ?? null,
    score,
    grade,
    status,
    updatedAt,
    totalProtocols,
    protocols: run.protocols ?? [],
    breakdown,
    metrics: {
      ...metrics,
      totalProtocols,
      averageFreshness: breakdown?.[0]?.score ?? null,
      averageCoverage: breakdown?.[1]?.score ?? null,
      validationScore: breakdown?.[2]?.score ?? null,
    },
  }
}

const toTrendPoint = (run) => {
  const timestampIso = normalizeTimestamp(run.run_timestamp ?? run.runTimestamp)
  const date = timestampIso ? new Date(timestampIso) : null
  const label = date
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : run.run_timestamp ?? run.runTimestamp
  return {
    x: label,
    y: clampScore(run.overall_health_score ?? run.overallHealthScore ?? 0, 0),
    timestamp: timestampIso,
  }
}

export const buildTrendSeries = (runs = [], { label = 'Health Score' } = {}) => {
  if (!Array.isArray(runs) || runs.length === 0) {
    return { series: [] }
  }

  const sorted = [...runs].sort(
    (a, b) =>
      (parseTimestamp(a.run_timestamp ?? a.runTimestamp)?.getTime() ?? 0) -
      (parseTimestamp(b.run_timestamp ?? b.runTimestamp)?.getTime() ?? 0),
  )

  return {
    series: [
      {
        id: label,
        data: sorted.map(toTrendPoint),
      },
    ],
  }
}
