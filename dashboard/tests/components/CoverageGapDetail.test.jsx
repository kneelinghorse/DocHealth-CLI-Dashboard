import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import CoverageGapDetail from '../../src/components/insights/CoverageGapDetail.jsx'

const gap = {
  id: 'gap-1',
  protocolName: 'API Protocol',
  urn: 'urn:dochealth:api:api-protocol',
  typeLabel: 'API',
  gapType: 'api-endpoint',
  reference: 'GET /users',
  severity: 'critical',
  coveragePercentage: 40,
  totalItems: 10,
  documentedItems: 4,
  issue: 'Missing: responses',
  recommendations: ['Document responses'],
  missingFields: ['responses'],
}

describe('CoverageGapDetail', () => {
  test('renders gap details when provided', () => {
    render(<CoverageGapDetail gap={gap} />)
    expect(screen.getByText('API Protocol')).toBeInTheDocument()
    expect(screen.getByText('GET /users')).toBeInTheDocument()
    expect(screen.getByText('Document responses')).toBeInTheDocument()
  })

  test('shows placeholder when no gap selected', () => {
    render(<CoverageGapDetail gap={null} />)
    expect(screen.getByText(/Select a coverage gap/i)).toBeInTheDocument()
  })
})
