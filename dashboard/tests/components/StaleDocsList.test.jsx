import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import StaleDocsList from '../../src/components/insights/StaleDocsList.jsx'

const sampleItems = [
  {
    id: 'api-protocol',
    protocolName: 'API Protocol',
    urn: 'urn:dochealth:api:api-protocol',
    typeLabel: 'API',
    severity: 'high',
    daysStale: 14,
    hasTimestamps: true,
    lastDocUpdate: '2024-12-10T00:00:00Z',
  },
]

describe('StaleDocsList', () => {
  test('renders entries and handles selection', () => {
    const handleSelect = vi.fn()
    render(<StaleDocsList items={sampleItems} selectedId="api-protocol" onSelect={handleSelect} />)

    expect(screen.getByText('API Protocol')).toBeInTheDocument()
    fireEvent.click(screen.getByText('API Protocol'))
    expect(handleSelect).toHaveBeenCalledWith('api-protocol')
  })

  test('shows empty message when no items are present', () => {
    render(<StaleDocsList items={[]} />)
    expect(screen.getByText(/No stale protocols match the current filters/i)).toBeInTheDocument()
  })
})
