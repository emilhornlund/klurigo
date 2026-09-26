import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import Stack from '../../../../../../components/Stack'

import UserPasswordForm from './UserPasswordForm'

type TextFieldProps = {
  id: string
  placeholder?: string
  value?: string
  disabled?: boolean
  onChange?: (value: string) => void
  onValid?: (valid: boolean) => void
  onAdditionalValidation?: (value: string) => string | boolean
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
    onAdditionalValidation,
  }: TextFieldProps) => {
    const additionalValidation = onAdditionalValidation?.(value ?? '')

    return (
      <>
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
        {typeof additionalValidation === 'string' && (
          <div data-testid={`${id}-error`}>{additionalValidation}</div>
        )}
      </>
    )
  },
  Typography: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

describe('UserPasswordForm', () => {
  it('validates confirmation and submits only the password fields', () => {
    const onChange = vi.fn()
    render(<UserPasswordForm loading={false} onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Lock It Down!' })).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Old Password'), {
      target: { value: 'OldPassword' },
    })
    fireEvent.change(screen.getByPlaceholderText('New Password'), {
      target: { value: 'NewPassword' },
    })
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'DifferentPassword' },
    })

    expect(screen.getByTestId('confirmPassword-error')).toHaveTextContent(
      'Password must equal the new password.',
    )
    const submit = screen.getByRole('button', { name: 'Lock It Down!' })
    expect(submit).not.toBeDisabled()

    fireEvent.submit(submit.closest('form')!)
    expect(onChange).toHaveBeenCalledWith({
      oldPassword: 'OldPassword',
      newPassword: 'NewPassword',
    })

    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), {
      target: { value: 'NewPassword' },
    })
    expect(
      screen.queryByTestId('confirmPassword-error'),
    ).not.toBeInTheDocument()
  })

  it('disables password fields and submission while loading', () => {
    render(<UserPasswordForm loading onChange={vi.fn()} />)

    expect(screen.getByPlaceholderText('Old Password')).toBeDisabled()
    expect(screen.getByPlaceholderText('New Password')).toBeDisabled()
    expect(screen.getByPlaceholderText('Confirm Password')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Lock It Down!' })).toBeDisabled()
  })
})
