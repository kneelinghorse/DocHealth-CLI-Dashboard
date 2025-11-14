export class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.details = details
  }
}

export class ValidationError extends HttpError {
  constructor(message, details) {
    super(400, message, details)
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super(404, message)
  }
}
