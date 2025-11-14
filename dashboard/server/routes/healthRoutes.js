import { Router } from 'express'
import { NotFoundError, ValidationError } from '../utils/errors.js'

const MAX_HISTORY_DAYS = 365

const formatRunPayload = (run) => ({
  runId: run.run_id,
  runTimestamp: run.run_timestamp,
  overallHealthScore: run.overall_health_score,
  totalProtocols: run.total_protocols_analyzed,
  protocols: run.snapshots.map((snapshot) => ({
    snapshotId: snapshot.snapshotId,
    protocolName: snapshot.protocolName,
    filePath: snapshot.filePath,
    healthScore: snapshot.healthScore,
    rawAnalysisOutput: snapshot.rawAnalysisOutput,
  })),
})

const parseDaysQuery = (value) => {
  if (value === undefined) {
    return 30
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ValidationError('Query parameter "days" must be a positive integer')
  }

  return Math.min(parsed, MAX_HISTORY_DAYS)
}

const validateAnalysisPayload = (payload) => {
  const errors = []
  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('Request body must be a JSON object')
  }

  if (!Array.isArray(payload.protocols) || payload.protocols.length === 0) {
    errors.push('At least one protocol snapshot is required')
  }

  payload.protocols?.forEach((protocol, index) => {
    if (!protocol?.protocolName) {
      errors.push(`protocols[${index}].protocolName is required`)
    }
    if (protocol?.analysis && typeof protocol.analysis !== 'object') {
      errors.push(`protocols[${index}].analysis must be an object when provided`)
    }
  })

  if (errors.length) {
    throw new ValidationError('Invalid analysis payload', errors)
  }
}

export const createHealthRouter = ({ repository }) => {
  if (!repository) {
    throw new Error('repository is required to create health routes')
  }

  const router = Router()

  router.get('/current', (req, res, next) => {
    try {
      const run = repository.getLatestRun()
      if (!run) {
        throw new NotFoundError('No analysis runs recorded yet')
      }
      res.json({
        status: 'ok',
        result: formatRunPayload(run),
      })
    } catch (error) {
      next(error)
    }
  })

  router.get('/history', (req, res, next) => {
    try {
      const days = parseDaysQuery(req.query?.days)
      const history = repository.getHistory(days)
      res.json({
        status: 'ok',
        window: { days },
        runs: history.map(formatRunPayload),
      })
    } catch (error) {
      next(error)
    }
  })

  router.post('/analyze', (req, res, next) => {
    try {
      validateAnalysisPayload(req.body)
      const result = repository.recordAnalysisRun(req.body)
      res.status(201).json({
        status: 'queued',
        runId: result.runId,
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}
