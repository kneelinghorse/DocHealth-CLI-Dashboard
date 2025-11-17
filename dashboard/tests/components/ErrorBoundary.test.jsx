import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ErrorBoundary from '../../src/components/common/ErrorBoundary.jsx'

const ProblemChild = () => {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  test('renders fallback when a child throws', () => {
    render(
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <div role="alert">
            <p>Fallback</p>
            <p>{error.message}</p>
          </div>
        )}
      >
        <ProblemChild />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Fallback')
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
  })

  test('offers reset callback from fallback render', () => {
    const ResettableChild = ({ shouldThrow }) => {
      if (shouldThrow) {
        throw new Error('reset-me')
      }
      return <p>Ready</p>
    }

    const fallbackRender = vi.fn(({ resetErrorBoundary }) => (
      <div role="alert">
        <button type="button" onClick={resetErrorBoundary}>
          Reset
        </button>
      </div>
    ))

    const { rerender } = render(
      <ErrorBoundary fallbackRender={fallbackRender}>
        <ResettableChild shouldThrow />
      </ErrorBoundary>,
    )

    rerender(
      <ErrorBoundary fallbackRender={fallbackRender}>
        <ResettableChild shouldThrow={false} />
      </ErrorBoundary>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Reset/i }))

    expect(screen.getByText('Ready')).toBeInTheDocument()
  })
})
