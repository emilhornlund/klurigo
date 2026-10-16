import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import AuthPasswordResetPageUI from './AuthPasswordResetPageUI'

describe('AuthPasswordResetPageUI', () => {
  it('renders default view', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthPasswordResetPageUI
          loading={false}
          error={false}
          submissionError={false}
          onSubmit={() => undefined}
        />
      </MemoryRouter>,
    )
    expect(container).toMatchSnapshot()
  })

  it('renders loading view', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthPasswordResetPageUI
          loading={true}
          error={false}
          submissionError={false}
          onSubmit={() => undefined}
        />
      </MemoryRouter>,
    )
    expect(container).toMatchSnapshot()
  })

  it('renders error view', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthPasswordResetPageUI
          loading={false}
          error={true}
          submissionError={false}
          onSubmit={() => undefined}
        />
      </MemoryRouter>,
    )
    expect(container).toMatchSnapshot()
  })

  it('keeps submit disabled until both fields are valid and match', async () => {
    const { container } = render(
      <MemoryRouter>
        <AuthPasswordResetPageUI
          loading={false}
          error={false}
          submissionError={false}
          onSubmit={() => undefined}
        />
      </MemoryRouter>,
    )

    const submit = container.querySelector(
      '#reset-password-button',
    ) as HTMLButtonElement
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('New Password'), {
      target: { value: 'PPss11!!' }, // meets regex
    })
    // still disabled because confirm is empty/invalid
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'PPss11!!' },
    })
    await waitFor(() => expect(submit).not.toBeDisabled())
  })

  it('stays disabled if password fails regex', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthPasswordResetPageUI
          loading={false}
          error={false}
          submissionError={false}
          onSubmit={() => undefined}
        />
      </MemoryRouter>,
    )

    const submit = container.querySelector(
      '#reset-password-button',
    ) as HTMLButtonElement

    fireEvent.change(screen.getByPlaceholderText('New Password'), {
      target: { value: 'Pp1!' }, // too short / not enough classes
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'Pp1!' },
    })
    expect(submit).toBeDisabled()
  })

  it('stays disabled when confirm does not match, then enables after fixing', async () => {
    const { container } = render(
      <MemoryRouter>
        <AuthPasswordResetPageUI
          loading={false}
          error={false}
          submissionError={false}
          onSubmit={() => undefined}
        />
      </MemoryRouter>,
    )

    const submit = container.querySelector(
      '#reset-password-button',
    ) as HTMLButtonElement

    fireEvent.change(screen.getByPlaceholderText('New Password'), {
      target: { value: 'PPss11!!' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'PPss11??' }, // mismatch
    })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'PPss11!!' }, // match now
    })
    await waitFor(() => expect(submit).not.toBeDisabled())
  })

  it('submits valid password', () => {
    const onSubmit = vi.fn()
    const { container } = render(
      <MemoryRouter>
        <AuthPasswordResetPageUI
          loading={false}
          error={false}
          submissionError={false}
          onSubmit={onSubmit}
        />
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

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ password: 'PPss11!!' })
  })

  it('disables submit when loading even with valid fields, and re-enables when loading prop changes', async () => {
    const onSubmit = vi.fn()
    const { container, rerender } = render(
      <MemoryRouter>
        <AuthPasswordResetPageUI
          loading={false}
          error={false}
          submissionError={false}
          onSubmit={onSubmit}
        />
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

    rerender(
      <MemoryRouter>
        <AuthPasswordResetPageUI
          loading={true}
          error={false}
          submissionError={false}
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    )
    expect(submit).toBeDisabled()

    rerender(
      <MemoryRouter>
        <AuthPasswordResetPageUI
          loading={false}
          error={false}
          submissionError={false}
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    )
    await waitFor(() => expect(submit).not.toBeDisabled())
  })
})
