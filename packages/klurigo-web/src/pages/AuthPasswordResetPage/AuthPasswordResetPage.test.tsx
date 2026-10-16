import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { NavigateFunction } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../api/api.utils'

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
      screen.getByRole('link', { name: 'Request a new password reset link' }),
    ).toHaveAttribute('href', '/auth/password/forgot')
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
    expect(
      screen.getByRole('link', { name: 'Request a new password reset link' }),
    ).toHaveAttribute('href', '/auth/password/forgot')
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

  it('allows a failed submission to be corrected and retried in the same page', async () => {
    h.resetPassword
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(undefined)

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

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'We couldn’t submit your password reset. Please try again.',
      ),
    )

    expect(h.navigate).not.toHaveBeenCalled()
    expect(document.querySelector('#reset-password-button')).not.toBeNull()
    expect(container).toMatchSnapshot()
    fireEvent.change(screen.getByPlaceholderText('New Password'), {
      target: { value: 'PPss22!!' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'PPss22!!' },
    })
    fireEvent.click(document.querySelector('#reset-password-button')!)
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/auth/login'))
    expect(h.resetPassword).toHaveBeenCalledTimes(2)
    expect(container).not.toHaveTextContent('Please try again.')
  })

  it('offers a new reset link when the server rejects the token', async () => {
    h.resetPassword.mockRejectedValueOnce(new ApiError('Invalid token', 401))
    render(
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
    fireEvent.click(document.querySelector('#reset-password-button')!)

    expect(
      await screen.findByRole('link', {
        name: 'Request a new password reset link',
      }),
    ).toHaveAttribute('href', '/auth/password/forgot')
  })
})
