import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import Card from '../../src/components/common/Card.jsx'

describe('Card component', () => {
  test('renders header when metadata is supplied', () => {
    render(
      <Card title="Sample Title" subtitle="Subheading" actions={<button type="button">Act</button>}>
        <p>Body</p>
      </Card>,
    )

    expect(screen.getByText('Sample Title')).toBeInTheDocument()
    expect(screen.getByText('Subheading')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument()
  })

  test('renders footer without header content', () => {
    render(<Card footer={<span>Footer content</span>}>Plain body</Card>)

    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })
})
