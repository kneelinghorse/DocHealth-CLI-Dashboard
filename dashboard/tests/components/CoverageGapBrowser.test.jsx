import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import CoverageGapBrowser from '../../src/components/insights/CoverageGapBrowser.jsx'

const sampleGaps = [
  {
    id: 'gap-1',
    protocolName: 'API Protocol',
    urn: 'urn:dochealth:api:api-protocol',
    reference: 'GET /users',
    gapType: 'api-endpoint',
    severity: 'critical',
    coveragePercentage: 40,
  },
]

describe('CoverageGapBrowser', () => {
  test('lists gaps and emits selection', () => {
    const handleSelect = vi.fn()
    render(<CoverageGapBrowser gaps={sampleGaps} selectedId="gap-1" onSelect={handleSelect} />)
    expect(screen.getByText('GET /users')).toBeInTheDocument()
    fireEvent.click(screen.getByText('API Protocol'))
    expect(handleSelect).toHaveBeenCalledWith('gap-1')
  })

  test('shows empty state when gaps are missing', () => {
    render(<CoverageGapBrowser gaps={[]} />)
    expect(screen.getByText(/No coverage gaps/i)).toBeInTheDocument()
  })
})
