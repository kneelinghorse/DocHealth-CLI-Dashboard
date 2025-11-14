import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import request from 'supertest'
import { createServer } from '../../server/server.js'
import { HealthRepository } from '../../server/db/healthRepository.js'
import { applyMigrations } from '../../server/db/schema.js'
import Database from 'better-sqlite3'

const createTestServer = () => {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  applyMigrations(db)
  const repository = new HealthRepository(db)
  const app = createServer({ repository })
  return { app, repository, db }
}

describe('health API routes', () => {
  let app
  let repository
  let db

  beforeEach(() => {
    const bootstrap = createTestServer()
    app = bootstrap.app
    repository = bootstrap.repository
    db = bootstrap.db
  })

  afterEach(() => {
    db.close()
  })

  test('GET /api/health/current returns 404 when database is empty', async () => {
    const response = await request(app).get('/api/health/current').expect(404)
    expect(response.body.error).toContain('No analysis runs recorded')
  })

  test('POST /api/health/analyze stores runs and snapshots', async () => {
    const payload = {
      runTimestamp: '2025-02-10T12:00:00Z',
      overallHealthScore: 82,
      protocols: [
        {
          protocolName: 'api',
          filePath: 'src/api_protocol_v_1_1_1.js',
          healthScore: 80,
          analysis: { status: 'green' },
        },
        {
          protocolName: 'workflow',
          filePath: 'src/workflow_protocol_v_1_1_1.js',
          healthScore: 75,
          analysis: { status: 'warning' },
        },
      ],
    }

    const response = await request(app).post('/api/health/analyze').send(payload).expect(201)

    expect(response.body.runId).toBeGreaterThan(0)
    const latest = repository.getLatestRun()
    expect(latest.overall_health_score).toBeCloseTo(82)
    expect(latest.snapshots).toHaveLength(2)
    expect(latest.snapshots[0].rawAnalysisOutput).toMatchObject({ status: expect.any(String) })
  })

  test('GET /api/health/current returns the latest run with protocol data', async () => {
    repository.recordAnalysisRun({
      runTimestamp: '2025-02-01T00:00:00Z',
      overallHealthScore: 76,
      protocols: [
        { protocolName: 'api', filePath: 'src/api.js', healthScore: 70, analysis: { foo: 'bar' } },
      ],
    })
    repository.recordAnalysisRun({
      runTimestamp: '2025-02-11T00:00:00Z',
      overallHealthScore: 91,
      protocols: [
        { protocolName: 'api', filePath: 'src/api.js', healthScore: 88, analysis: { foo: 'baz' } },
        { protocolName: 'data', filePath: 'src/data.js', healthScore: 84, analysis: { foo: 'qux' } },
      ],
    })

    const response = await request(app).get('/api/health/current').expect(200)

    expect(response.body.result.overallHealthScore).toBeCloseTo(91)
    expect(response.body.result.protocols).toHaveLength(2)
    expect(response.body.result.protocols[0]).toHaveProperty('rawAnalysisOutput')
  })

  test('GET /api/health/history filters by day window', async () => {
    repository.recordAnalysisRun({
      runTimestamp: Date.now(),
      overallHealthScore: 80,
      protocols: [{ protocolName: 'api', filePath: 'src/api.js', healthScore: 80 }],
    })
    repository.recordAnalysisRun({
      runTimestamp: Date.now() - 60 * 24 * 60 * 60 * 1000,
      overallHealthScore: 70,
      protocols: [{ protocolName: 'data', filePath: 'src/data.js', healthScore: 70 }],
    })

    const response = await request(app).get('/api/health/history?days=30').expect(200)

    expect(response.body.runs).toHaveLength(1)
    expect(response.body.runs[0].protocols[0].protocolName).toBe('api')
  })

  test('GET /api/health/history rejects invalid query', async () => {
    const response = await request(app).get('/api/health/history?days=zero').expect(400)
    expect(response.body.error).toContain('Query parameter')
  })

  test('POST /api/health/analyze validates payload shape', async () => {
    const response = await request(app)
      .post('/api/health/analyze')
      .send({ protocols: [] })
      .expect(400)

    expect(response.body.details).toContain('At least one protocol snapshot is required')
  })
})
