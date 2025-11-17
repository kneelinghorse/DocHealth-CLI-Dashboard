import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingState from '../../src/components/common/LoadingState.jsx'

describe('LoadingState', () => {
  test('announces spinner loading state with label', () => {
    render(<LoadingState label="Loading protocols" variant="spinner" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading protocols')
  })

  test('renders skeleton rows when requested', () => {
    const { container } = render(<LoadingState variant="skeleton" lines={4} label="Loading data" />)
    expect(container.querySelectorAll('.loading-state__skeleton-row')).toHaveLength(4)
  })
})
