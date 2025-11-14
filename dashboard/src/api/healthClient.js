const API_BASE =
  import.meta.env.VITE_DOCHEALTH_API_BASE?.replace(/\/$/, '') ?? '/api/health'

class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

const buildUrl = (path = '') => `${API_BASE}${path}`

const parseJson = async (response) => {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  const text = await response.text()
  return text ? JSON.parse(text) : {}
}

const handleResponse = async (response) => {
  if (response.ok) {
    return parseJson(response)
  }

  const body = await parseJson(response).catch(() => ({}))
  const message = body?.error || `Request failed with status ${response.status}`
  throw new ApiError(message, response.status, body?.details)
}

export const fetchCurrentHealth = async ({ signal } = {}) => {
  const response = await fetch(buildUrl('/current'), { signal })
  const payload = await handleResponse(response)
  return payload?.result ?? null
}

export const fetchHealthHistory = async ({ days = 30, signal } = {}) => {
  const params = new URLSearchParams()
  if (days) {
    params.set('days', String(days))
  }
  const response = await fetch(buildUrl(`/history?${params.toString()}`), { signal })
  return handleResponse(response)
}

export { ApiError }
