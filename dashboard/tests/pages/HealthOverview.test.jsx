import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import HealthOverview from '../../src/pages/HealthOverview.jsx'

describe('HealthOverview page', () => {
  test('renders score card and recommended actions', () => {
    render(<HealthOverview />)

    expect(screen.getByText(/documentation health score/i)).toBeInTheDocument()
    expect(screen.getByText(/Recommended Actions/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /assign/i })).toHaveLength(3)
  })
})
