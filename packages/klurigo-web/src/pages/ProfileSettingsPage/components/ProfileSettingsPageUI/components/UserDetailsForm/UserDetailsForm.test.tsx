import { AuthProvider } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import Stack from '../../../../../../components/Stack'

import UserDetailsForm from './UserDetailsForm'

type TextFieldProps = {
  id: string
  placeholder?: string
  value?: string
  disabled?: boolean
  onChange?: (value: string) => void
  onValid?: (valid: boolean) => void
}

vi.mock('../../../../../../components', () => ({
  Stack,
  Button: ({
    id,
    type,
    value,
    disabled,
    loading,
  }: {
    id: string
    type: 'submit' | 'reset' | 'button'
    value?: ReactNode
    disabled?: boolean
    loading?: boolean
  }) => (
    <button type={type} id={id} disabled={disabled || loading}>
      {value}
    </button>
  ),
  TextField: ({
    id,
    placeholder,
    value,
    disabled,
    onChange,
    onValid,
  }: TextFieldProps) => (
    <input
      id={id}
      placeholder={placeholder}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => {
        onChange?.(event.currentTarget.value)
        onValid?.(true)
      }}
    />
  ),
  Typography: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../../../../../components/NicknameTextField', () => ({
  default: ({
    value,
    disabled,
    onChange,
    onValid,
  }: {
    value?: string
    disabled?: boolean
    onChange?: (value: string) => void
    onValid?: (valid: boolean) => void
  }) => (
    <input
      aria-label="Nickname"
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => {
        onChange?.(event.currentTarget.value)
        onValid?.(true)
      }}
    />
  ),
}))

const values = {
  email: 'user@example.com',
  unverifiedEmail: 'pending@example.com',
  givenName: 'Jane',
  familyName: 'Doe',
  defaultNickname: 'QuizFox',
}

describe('UserDetailsForm', () => {
  it('submits changed valid details and resends an unverified email', () => {
    const onChange = vi.fn()
    const onClickResendVerificationEmail = vi.fn()

    render(
      <UserDetailsForm
        authProvider={AuthProvider.Local}
        values={values}
        loading={false}
        onChange={onChange}
        onClickResendVerificationEmail={onClickResendVerificationEmail}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Zap me a fresh verification link!',
      }),
    )
    expect(onClickResendVerificationEmail).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'new@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Given Name'), {
      target: { value: 'New' },
    })
    fireEvent.change(screen.getByPlaceholderText('Family Name'), {
      target: { value: 'Name' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Nickname' }), {
      target: { value: 'NewFox' },
    })

    const save = screen.getByRole('button', { name: 'Save!' })
    expect(save).not.toBeDisabled()
    fireEvent.submit(save.closest('form')!)

    expect(onChange).toHaveBeenCalledWith({
      email: 'new@example.com',
      unverifiedEmail: 'pending@example.com',
      givenName: 'New',
      familyName: 'Name',
      defaultNickname: 'NewFox',
    })
  })

  it('disables identity fields for Google accounts and all fields while loading', () => {
    const props = {
      authProvider: AuthProvider.Google,
      values,
      loading: false,
      onChange: vi.fn(),
      onClickResendVerificationEmail: vi.fn(),
    }
    const { rerender } = render(<UserDetailsForm {...props} />)

    expect(screen.getByPlaceholderText('Email')).toBeDisabled()
    expect(screen.getByPlaceholderText('Given Name')).toBeDisabled()
    expect(screen.getByPlaceholderText('Family Name')).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Nickname' })).not.toBeDisabled()

    rerender(<UserDetailsForm {...props} loading />)
    expect(screen.getByRole('textbox', { name: 'Nickname' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save!' })).toBeDisabled()
  })
})
