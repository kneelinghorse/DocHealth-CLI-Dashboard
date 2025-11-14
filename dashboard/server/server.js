import express from 'express'
import { createHealthRouter } from './routes/healthRoutes.js'
import { HttpError } from './utils/errors.js'

export const createServer = ({ repository }) => {
  if (!repository) {
    throw new Error('repository instance is required to create the server')
  }

  const app = express()
  app.use(express.json({ limit: '1mb' }))

  app.use('/api/health', createHealthRouter({ repository }))

  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      error: 'Endpoint not found',
    })
  })

  app.use((error, req, res, _next) => {
    if (res.headersSent && typeof _next === 'function') {
      return _next(error)
    }

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        status: 'error',
        error: error.message,
        details: error.details,
      })
    }

    console.error('[DocHealth API] Unexpected error', error)
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
    })
  })

  return app
}
