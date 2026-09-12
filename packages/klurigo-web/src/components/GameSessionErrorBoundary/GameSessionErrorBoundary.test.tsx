import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextType } from '../../context/auth'

import GameSessionErrorBoundary from './GameSessionErrorBoundary'

const h = vi.hoisted(() => ({
  revokeGameMock: vi.fn(() => Promise.resolve()),
}))

const ThrowingChild = (): ReactNode => {
  throw new Error('internal rendering details')
}

const renderBoundary = () =>
  render(
    <MemoryRouter>
      <AuthContext.Provider
        value={
          {
            isUserAuthenticated: false,
            isGameAuthenticated: true,
            revokeGame: h.revokeGameMock,
          } as unknown as AuthContextType
        }>
        <GameSessionErrorBoundary>
          <ThrowingChild />
        </GameSessionErrorBoundary>
      </AuthContext.Provider>
    </MemoryRouter>,
  )

beforeEach(() => {
  h.revokeGameMock.mockClear()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GameSessionErrorBoundary', () => {
  it('renders a recovery fallback when a game view fails to render', () => {
    renderBoundary()

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Game view unavailable')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reload game' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Return home' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/reload the game or return home/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/internal rendering details/i),
    ).not.toBeInTheDocument()
  })

  it('returns home without exposing the rendering error', () => {
    renderBoundary()

    screen.getByTestId('test-return-home-button').click()

    expect(h.revokeGameMock).toHaveBeenCalledWith({ redirectTo: '/' })
    expect(
      screen.queryByText(/internal rendering details/i),
    ).not.toBeInTheDocument()
  })
})
