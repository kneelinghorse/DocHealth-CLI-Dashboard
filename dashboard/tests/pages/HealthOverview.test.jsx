import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HealthOverview from '../../src/pages/HealthOverview.jsx'

vi.mock('@nivo/line', () => ({
  ResponsiveLine: () => <div data-testid="trend-chart-stub" />,
}))

vi.mock('@nivo/bar', () => ({
  ResponsiveBar: () => <div data-testid="breakdown-chart-stub" />,
}))

const scoreRefetch = vi.fn()
const historyRefetch = vi.fn()

const healthScoreMock = {
  data: {
    score: 82,
    grade: 'B',
    status: { label: 'Healthy', tone: 'healthy', description: 'Stable' },
    updatedAt: '2025-02-10T00:00:00.000Z',
    breakdown: [
      { id: 'freshness', label: 'Freshness', score: 80, weight: 0.4 },
      { id: 'coverage', label: 'Coverage', score: 75, weight: 0.4 },
      { id: 'validation', label: 'Validation', score: 90, weight: 0.2 },
    ],
    metrics: {
      totalProtocols: 5,
      staleProtocols: 1,
      averageFreshness: 80,
      averageCoverage: 75,
      validationScore: 90,
    },
  },
  loading: false,
  error: null,
  refetch: scoreRefetch,
}

const healthHistoryMock = {
  data: {
    series: [{ id: 'Health Score', data: [{ x: 'Mon', y: 80 }] }],
    window: { days: 30 },
  },
  loading: false,
  error: null,
  refetch: historyRefetch,
}

vi.mock('../../src/hooks/useHealthScore.js', () => ({
  useHealthScore: () => healthScoreMock,
}))

vi.mock('../../src/hooks/useHealthHistory.js', () => ({
  useHealthHistory: () => healthHistoryMock,
}))

describe('HealthOverview page', () => {
  test('renders score dashboard and charts', () => {
    render(<HealthOverview />)

    expect(screen.getByText(/Documentation Health/i)).toBeInTheDocument()
    expect(screen.getByText(/Health Score Trend/i)).toBeInTheDocument()
    expect(screen.getByText(/Score Breakdown/i)).toBeInTheDocument()
    expect(screen.getByTestId('trend-chart-stub')).toBeInTheDocument()
    expect(screen.getByTestId('breakdown-chart-stub')).toBeInTheDocument()
  })
})
