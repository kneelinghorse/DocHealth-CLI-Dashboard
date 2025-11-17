import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ErrorDisplay from '../../src/components/common/ErrorDisplay.jsx'

describe('ErrorDisplay', () => {
  test('renders title, message, and details', () => {
    render(
      <ErrorDisplay
        title="Unable to load data"
        message="Network request failed."
        error={new Error('Bad gateway')}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load data')
    expect(screen.getByText(/Network request failed/i)).toBeInTheDocument()
    expect(screen.getByText(/Bad gateway/i)).toBeInTheDocument()
  })

  test('invokes retry handler when provided', () => {
    const handleRetry = vi.fn()
    render(<ErrorDisplay onRetry={handleRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }))
    expect(handleRetry).toHaveBeenCalled()
  })
})
