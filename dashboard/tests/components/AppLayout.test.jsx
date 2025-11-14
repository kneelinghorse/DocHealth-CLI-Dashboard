import { describe, expect, test } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import AppLayout from '../../src/components/layout/AppLayout.jsx'

const renderWithRouter = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<div>Health Overview Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('AppLayout', () => {
  test('shows navigation links and wraps outlet content', () => {
    renderWithRouter()

    expect(screen.getByText(/DocHealth Dashboard/i)).toBeInTheDocument()
    expect(screen.getByText(/Health Overview Content/i)).toBeInTheDocument()

    const healthLink = screen.getByRole('link', { name: /Health Score/i })
    expect(healthLink.className).toContain('primary-nav__link--active')
  })
})
