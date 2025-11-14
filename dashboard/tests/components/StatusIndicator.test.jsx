import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusIndicator from '../../src/components/health/StatusIndicator.jsx'

describe('StatusIndicator', () => {
  test('renders label and description with tone modifier', () => {
    render(<StatusIndicator tone="warning" label="Warning" description="Docs require review" />)

    expect(screen.getByText(/Warning/)).toBeInTheDocument()
    expect(screen.getByText(/Docs require review/)).toBeInTheDocument()
    expect(screen.getByRole('status').className).toContain('status-indicator--warning')
  })
})
