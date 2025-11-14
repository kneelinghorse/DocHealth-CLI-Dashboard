import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import StaleDocDetail from '../../src/components/insights/StaleDocDetail.jsx'

const sampleItem = {
  id: 'api-protocol',
  protocolName: 'API Protocol',
  urn: 'urn:dochealth:api:api-protocol',
  typeLabel: 'API',
  severity: 'high',
  daysStale: 14,
  lastCodeChange: '2025-01-01T00:00:00Z',
  lastDocUpdate: '2024-12-15T00:00:00Z',
  thresholdDays: 7,
  score: 60,
  status: 'Documentation outdated',
  hasTimestamps: true,
  recommendations: ['Update docs'],
}

describe('StaleDocDetail', () => {
  test('renders detail information when item is provided', () => {
    render(<StaleDocDetail item={sampleItem} />)
    expect(screen.getByText('API Protocol')).toBeInTheDocument()
    expect(screen.getByText('Documentation outdated')).toBeInTheDocument()
    expect(screen.getByText('Update docs')).toBeInTheDocument()
  })

  test('shows placeholder when no item is selected', () => {
    render(<StaleDocDetail item={null} />)
    expect(screen.getByText(/Select a protocol/i)).toBeInTheDocument()
  })
})
