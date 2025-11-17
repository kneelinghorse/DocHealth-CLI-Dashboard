import { Component } from 'react'
import ErrorDisplay from './ErrorDisplay.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo)
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null })
    if (typeof this.props.onReset === 'function') {
      this.props.onReset()
    }
  }

  render() {
    const { hasError, error } = this.state
    const { children, fallback, fallbackRender } = this.props

    if (hasError) {
      if (typeof fallbackRender === 'function') {
        return fallbackRender({
          error,
          resetErrorBoundary: this.resetErrorBoundary,
        })
      }

      if (fallback) {
        return fallback
      }

      return (
        <ErrorDisplay
          title="Unable to render this section"
          message="An unexpected error occurred."
          error={error}
          onRetry={this.resetErrorBoundary}
          actionLabel="Reload section"
        />
      )
    }

    return children
  }
}

export default ErrorBoundary
