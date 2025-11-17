import { describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HealthScoreDashboard from '../../src/components/health/HealthScoreDashboard.jsx'

const baseData = {
  score: 82,
  grade: 'B',
  status: { label: 'Healthy', tone: 'healthy', description: 'Within operational target' },
  updatedAt: '2025-02-10T12:00:00.000Z',
  metrics: {
    totalProtocols: 4,
    staleProtocols: 1,
    averageFreshness: 78,
    averageCoverage: 72,
    validationScore: 90,
  },
}

describe('HealthScoreDashboard', () => {
  test('renders score, grade, and metrics when data is available', () => {
    render(<HealthScoreDashboard data={baseData} loading={false} error={null} />)

    expect(screen.getByText('82')).toBeInTheDocument()
    expect(screen.getByText(/Grade B/i)).toBeInTheDocument()
    expect(screen.getByText(/Stale protocols/i)).toBeInTheDocument()
    expect(screen.getByText(/Validation/i)).toBeInTheDocument()
  })

  test('shows loading state', () => {
    render(<HealthScoreDashboard loading data={null} error={null} />)
    expect(screen.getByText(/Loading health score/i)).toBeInTheDocument()
  })

  test('displays error state and retries when clicking button', () => {
    const onRefresh = vi.fn()
    render(
      <HealthScoreDashboard
        loading={false}
        data={null}
        error={new Error('boom')}
        onRefresh={onRefresh}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load health score')
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }))
    expect(onRefresh).toHaveBeenCalled()
  })

  test('shows empty state when no data has been recorded', () => {
    render(<HealthScoreDashboard loading={false} data={null} error={null} />)
    expect(screen.getByText(/No health runs yet/i)).toBeInTheDocument()
  })
})
