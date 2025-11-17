import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from '../../src/components/common/EmptyState.jsx'

describe('EmptyState', () => {
  test('renders title and description', () => {
    render(<EmptyState title="No items" description="Try syncing data" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText('Try syncing data')).toBeInTheDocument()
  })
})
