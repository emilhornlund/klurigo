import { TokenScope } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProtectedRoute from './ProtectedRoute'

// --- Mock AuthContext hook with mutable state ---
type MockAuth = {
  isUserAuthenticated: boolean
  isUserRecoveryPending: boolean
  isGameAuthenticated: boolean
}
let mockAuth: MockAuth = {
  isUserAuthenticated: false,
  isUserRecoveryPending: false,
  isGameAuthenticated: false,
}

vi.mock('../../context/auth', () => ({
  useAuthContext: () => mockAuth,
}))

function renderAt(path: string, ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockAuth = {
      isUserAuthenticated: false,
      isUserRecoveryPending: false,
      isGameAuthenticated: false,
    }
  })

  it('renders children when User scope is authenticated (default props)', () => {
    mockAuth.isUserAuthenticated = true

    const { container } = renderAt(
      '/protected',
      <ProtectedRoute>
        <div>Protected User</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Protected User')).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })

  it('redirects to "/" when User scope is not authenticated (default authenticated=true)', () => {
    mockAuth.isUserAuthenticated = false

    const { container } = renderAt(
      '/protected',
      <ProtectedRoute>
        <div>Protected User</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Home')).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })

  it('keeps the protected child while User session recovery is pending', () => {
    mockAuth.isUserRecoveryPending = true

    renderAt(
      '/protected',
      <ProtectedRoute>
        <div>Recovering protected route</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Recovering protected route')).toBeInTheDocument()
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
  })

  it('redirects after User recovery fails', () => {
    mockAuth.isUserRecoveryPending = false

    renderAt(
      '/protected',
      <ProtectedRoute>
        <div>Protected User</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('renders children for guest-only route when User is NOT authenticated (authenticated=false)', () => {
    mockAuth.isUserAuthenticated = false

    const { container } = renderAt(
      '/protected',
      <ProtectedRoute authenticated={false}>
        <div>Guest Only</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Guest Only')).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })

  it('redirects for guest-only route when User IS authenticated (authenticated=false)', () => {
    mockAuth.isUserAuthenticated = true

    const { container } = renderAt(
      '/protected',
      <ProtectedRoute authenticated={false}>
        <div>Guest Only</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Home')).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })

  it('renders children when Game scope is authenticated', () => {
    mockAuth.isGameAuthenticated = true

    const { container } = renderAt(
      '/protected',
      <ProtectedRoute scope={TokenScope.Game}>
        <div>Protected Game</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Protected Game')).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })

  it('redirects when Game scope is NOT authenticated', () => {
    mockAuth.isGameAuthenticated = false

    const { container } = renderAt(
      '/protected',
      <ProtectedRoute scope={TokenScope.Game}>
        <div>Protected Game</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Home')).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })
})
