import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScoreBreakdown from '../../src/components/charts/ScoreBreakdown.jsx'

vi.mock('@nivo/bar', () => ({
  ResponsiveBar: ({ data }) => (
    <div data-testid="bar-chart">{data.map((item) => `${item.label}:${item.score}`).join('|')}</div>
  ),
}))

const breakdown = [
  { id: 'freshness', label: 'Freshness', score: 80, weight: 0.4 },
  { id: 'coverage', label: 'Coverage', score: 70, weight: 0.4 },
  { id: 'validation', label: 'Validation', score: 90, weight: 0.2 },
]

describe('ScoreBreakdown', () => {
  test('renders bar chart when breakdown data is provided', () => {
    render(<ScoreBreakdown breakdown={breakdown} loading={false} error={null} />)

    expect(screen.getByTestId('bar-chart')).toHaveTextContent('Freshness:80')
  })

  test('shows loading state', () => {
    render(<ScoreBreakdown loading breakdown={[]} error={null} />)
    expect(screen.getByText(/Loading breakdown/i)).toBeInTheDocument()
  })

  test('shows error message when request fails', () => {
    render(<ScoreBreakdown loading={false} breakdown={[]} error={new Error('nope')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load breakdown')
  })

  test('renders empty state when there is no breakdown data', () => {
    render(<ScoreBreakdown loading={false} breakdown={[]} error={null} />)
    expect(screen.getByText(/No breakdown data/i)).toBeInTheDocument()
  })
})
