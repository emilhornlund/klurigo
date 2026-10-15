import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { NavigateFunction } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  expired: false,
  resetPassword: vi
    .fn<(payload: { password: string }, token: string) => Promise<void>>()
    .mockResolvedValue(undefined),
  navigate: vi.fn<NavigateFunction>(),
}))

vi.mock('../../api/api.utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/api.utils')>()),
  isTokenExpired: () => h.expired,
}))

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({ resetPassword: h.resetPassword }),
}))

vi.mock('react-router-dom', async (orig) => {
  const actual = await orig()
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return { ...actual, useNavigate: () => h.navigate }
})

import AuthPasswordResetPage from './AuthPasswordResetPage'

describe('AuthPasswordResetPage', () => {
  beforeEach(() => {
    h.expired = false
    h.resetPassword.mockClear()
    h.navigate.mockClear()
  })

  it('shows error when token is missing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/auth/password/reset']}>
        <AuthPasswordResetPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Oops! Something went wrong.')).toBeInTheDocument()
    expect(
      screen.getByText('The supplied link is invalid or has expired.'),
    ).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('shows error when token is expired', () => {
    h.expired = true
    const { container } = render(
      <MemoryRouter initialEntries={['/auth/password/reset?token=T1']}>
        <AuthPasswordResetPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Oops! Something went wrong.')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('submits valid password, disables button while pending, then navigates on success', async () => {
    let resolve!: () => void
    h.resetPassword.mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolve = r
        }),
    )

    const { container } = render(
      <MemoryRouter initialEntries={['/auth/password/reset?token=T1']}>
        <AuthPasswordResetPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('New Password'), {
      target: { value: 'PPss11!!' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'PPss11!!' },
    })

    const submit = container.querySelector(
      '#reset-password-button',
    ) as HTMLButtonElement
    expect(submit).not.toBeDisabled()

    fireEvent.click(submit)
    expect(h.resetPassword).toHaveBeenCalledWith({ password: 'PPss11!!' }, 'T1')
    expect(submit).toBeDisabled()

    resolve()
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/auth/login'))
    expect(submit).not.toBeDisabled()
  })

  it('shows error view on failure and does not navigate', async () => {
    let reject!: (e?: unknown) => void
    h.resetPassword.mockImplementation(
      () =>
        new Promise<void>((_, r) => {
          reject = r
        }),
    )

    const { container } = render(
      <MemoryRouter initialEntries={['/auth/password/reset?token=T1']}>
        <AuthPasswordResetPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('New Password'), {
      target: { value: 'PPss11!!' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'PPss11!!' },
    })

    const submit = container.querySelector(
      '#reset-password-button',
    ) as HTMLButtonElement
    fireEvent.click(submit)
    expect(submit).toBeDisabled()

    reject(new Error('nope'))

    await waitFor(() =>
      expect(
        screen.getByText('Oops! Something went wrong.'),
      ).toBeInTheDocument(),
    )

    expect(h.navigate).not.toHaveBeenCalled()
    expect(document.querySelector('#reset-password-button')).toBeNull()
    expect(container).toMatchSnapshot()
  })
})
