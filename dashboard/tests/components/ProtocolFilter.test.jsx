import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ProtocolFilter from '../../src/components/insights/ProtocolFilter.jsx'

describe('ProtocolFilter', () => {
  test('renders provided options and triggers onChange', () => {
    const handleChange = vi.fn()
    render(
      <ProtocolFilter
        label="Protocols"
        value="api"
        options={[
          { value: 'all', label: 'All', count: 3 },
          { value: 'api', label: 'API', count: 2 },
        ]}
        onChange={handleChange}
      />,
    )

    fireEvent.click(screen.getByText('All'))
    expect(handleChange).toHaveBeenCalledWith('all')
    expect(screen.getByText('API')).toBeInTheDocument()
  })
})
