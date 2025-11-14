import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import Button from '../../src/components/common/Button.jsx'

describe('Button component', () => {
  test('applies variant and size modifiers', () => {
    render(
      <Button variant="ghost" size="sm" fullWidth>
        Trigger
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Trigger' })
    expect(button.className).toContain('button--ghost')
    expect(button.className).toContain('button--sm')
    expect(button.className).toContain('button--full')
  })
})
