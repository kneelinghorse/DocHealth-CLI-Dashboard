import { applyMigrations } from './schema.js'
import { createDatabase } from './client.js'

const toUnixSeconds = (input) => {
  if (!input) {
    return Math.floor(Date.now() / 1000)
  }

  if (typeof input === 'number') {
    return input > 10_000_000_000 ? Math.floor(input / 1000) : input
  }

  const parsed = Date.parse(input)
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid timestamp provided: ${input}`)
  }
  return Math.floor(parsed / 1000)
}

const parseJsonSafe = (value) => {
  if (typeof value !== 'string') {
    return value ?? null
  }
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export class HealthRepository {
  constructor(db) {
    this.db = db

    this.statements = {
      findProtocol: this.db.prepare(
        `SELECT protocol_id, protocol_name, file_path FROM protocol_definitions WHERE protocol_name = ?`,
      ),
      insertProtocol: this.db.prepare(
        `INSERT INTO protocol_definitions (protocol_name, file_path) VALUES (?, ?)`,
      ),
      updateProtocolPath: this.db.prepare(
        `UPDATE protocol_definitions SET file_path = ? WHERE protocol_id = ?`,
      ),
      insertRun: this.db.prepare(
        `INSERT INTO analysis_runs (run_timestamp, overall_health_score, total_protocols_analyzed)
        VALUES (@runTimestamp, @overallHealthScore, @totalProtocolsAnalyzed)`,
      ),
      insertSnapshot: this.db.prepare(
        `INSERT INTO protocol_snapshots (run_id, protocol_id, health_score, raw_analysis_output)
        VALUES (@runId, @protocolId, @healthScore, @rawAnalysisOutput)`,
      ),
      selectLatestRun: this.db.prepare(
        `SELECT run_id, run_timestamp, overall_health_score, total_protocols_analyzed
        FROM analysis_runs
        ORDER BY run_timestamp DESC
        LIMIT 1`,
      ),
      selectSnapshotsForRun: this.db.prepare(
        `SELECT ps.snapshot_id, ps.health_score, ps.raw_analysis_output, pd.protocol_name, pd.file_path
        FROM protocol_snapshots ps
        JOIN protocol_definitions pd ON pd.protocol_id = ps.protocol_id
        WHERE ps.run_id = ?
        ORDER BY pd.protocol_name ASC`,
      ),
      selectHistory: this.db.prepare(
        `SELECT run_id, run_timestamp, overall_health_score, total_protocols_analyzed
        FROM analysis_runs
        WHERE run_timestamp >= @threshold
        ORDER BY run_timestamp DESC`,
      ),
      deleteSnapshotsByRun: this.db.prepare(
        `DELETE FROM protocol_snapshots WHERE run_id = ?`,
      ),
    }
  }

  ensureProtocolDefinition(protocol) {
    const protocolName = protocol?.protocolName ?? protocol?.name
    const filePath = protocol?.filePath ?? null
    if (!protocolName) {
      throw new Error('protocolName is required')
    }

    const existing = this.statements.findProtocol.get(protocolName)
    if (existing) {
      if (filePath && existing.file_path !== filePath) {
        this.statements.updateProtocolPath.run(filePath, existing.protocol_id)
      }
      return existing.protocol_id
    }

    const result = this.statements.insertProtocol.run(protocolName, filePath)
    return Number(result.lastInsertRowid)
  }

  recordAnalysisRun(input) {
    if (!input?.protocols?.length) {
      throw new Error('At least one protocol snapshot is required')
    }

    const runTimestamp = toUnixSeconds(input.runTimestamp)
    const parsedScore = Number.parseFloat(input.overallHealthScore ?? input.score ?? 0)
    const overallHealthScore = Number.isFinite(parsedScore) ? parsedScore : 0
    const totalProtocolsAnalyzed =
      input.totalProtocolsAnalyzed ?? input.protocols.length

    const insertTransaction = this.db.transaction((payload) => {
      const runResult = this.statements.insertRun.run({
        runTimestamp,
        overallHealthScore,
        totalProtocolsAnalyzed,
      })
      const runId = Number(runResult.lastInsertRowid)

      payload.protocols.forEach((protocol) => {
        const protocolId = this.ensureProtocolDefinition(protocol)
        const parsedHealth = Number.parseFloat(protocol.healthScore ?? protocol.score ?? 0)
        const healthScore = Number.isFinite(parsedHealth) ? parsedHealth : 0
        const rawAnalysisOutput = JSON.stringify(protocol.analysis ?? protocol)
        this.statements.insertSnapshot.run({
          runId,
          protocolId,
          healthScore,
          rawAnalysisOutput,
        })
      })

      return { runId }
    })

    return insertTransaction(input)
  }

  getLatestRun() {
    const run = this.statements.selectLatestRun.get()
    if (!run) {
      return null
    }

    return {
      ...run,
      snapshots: this.getSnapshotsForRun(run.run_id),
    }
  }

  getSnapshotsForRun(runId) {
    const rows = this.statements.selectSnapshotsForRun.all(runId)
    return rows.map((row) => ({
      snapshotId: row.snapshot_id,
      protocolName: row.protocol_name,
      filePath: row.file_path,
      healthScore: row.health_score,
      rawAnalysisOutput: parseJsonSafe(row.raw_analysis_output),
    }))
  }

  getHistory(days = 30) {
    const multiplier = Math.max(Number(days) || 0, 1)
    const nowSeconds = Math.floor(Date.now() / 1000)
    const threshold = nowSeconds - multiplier * 86_400
    const rows = this.statements.selectHistory.all({ threshold })

    return rows.map((row) => ({
      ...row,
      snapshots: this.getSnapshotsForRun(row.run_id),
    }))
  }
}

export const createDefaultRepository = (dbPath) => {
  const database = createDatabase(dbPath)
  applyMigrations(database)
  return new HealthRepository(database)
}
