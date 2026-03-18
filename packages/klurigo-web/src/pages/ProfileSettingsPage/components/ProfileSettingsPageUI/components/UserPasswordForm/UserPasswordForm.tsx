import { faLock } from '@fortawesome/free-solid-svg-icons'
import type { AuthPasswordChangeRequestDto } from '@klurigo/common'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
} from '@klurigo/common'
import type { FC, FormEvent } from 'react'
import { useMemo, useState } from 'react'

import { Button, TextField, Typography } from '../../../../../../components'
import styles from '../../../../../../styles/form.module.scss'

export type UpdateUserPasswordFormFields = AuthPasswordChangeRequestDto

type UpdateUserPasswordWithConfirmationFormFields =
  AuthPasswordChangeRequestDto & { confirmPassword: string }

export interface UserPasswordFormProps {
  loading: boolean
  onChange: (request: UpdateUserPasswordFormFields) => void
}

const UserPasswordForm: FC<UserPasswordFormProps> = ({ loading, onChange }) => {
  const [formFields, setFormFields] =
    useState<UpdateUserPasswordWithConfirmationFormFields>({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    })

  const handleChangeFormField = <
    K extends keyof UpdateUserPasswordWithConfirmationFormFields,
  >(
    key: K,
    value: UpdateUserPasswordWithConfirmationFormFields[K],
  ) => {
    setFormFields({ ...formFields, [key]: value })
  }

  const [validFormFields, setValidFormFields] = useState<{
    [key in keyof UpdateUserPasswordWithConfirmationFormFields]: boolean
  }>({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  })

  const isFormValid = useMemo(
    () => Object.values(validFormFields).every((valid) => !!valid),
    [validFormFields],
  )

  const handleChangeValidFormField = <
    K extends keyof UpdateUserPasswordWithConfirmationFormFields,
  >(
    key: K,
    valid: boolean,
  ) => {
    if (validFormFields[key] !== valid) {
      setValidFormFields((prevState) => {
        return { ...prevState, [key]: valid }
      })
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onChange({
      oldPassword: formFields.oldPassword,
      newPassword: formFields.newPassword,
    })
  }

  return (
    <>
      <Typography variant="subtitle">Upgrade Your Password</Typography>
      <Typography variant="text" size="medium">
        Enhance your account security with a fresh password—verify your current
        one, choose a new one, and confirm to complete the update.
      </Typography>
      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          id="oldPassword"
          type="password"
          placeholder="Old Password"
          value={formFields.oldPassword}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          regex={{
            value: PASSWORD_REGEX,
            message:
              'Must include at least ≥2 uppercase, ≥2 lowercase, ≥2 digits, ≥2 symbols.',
          }}
          disabled={loading}
          onChange={(value) =>
            handleChangeFormField('oldPassword', value as string)
          }
          onValid={(valid) => handleChangeValidFormField('oldPassword', valid)}
          required
        />
        <TextField
          id="newPassword"
          type="password"
          placeholder="New Password"
          value={formFields.newPassword}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          regex={{
            value: PASSWORD_REGEX,
            message:
              'Must include at least ≥2 uppercase, ≥2 lowercase, ≥2 digits, ≥2 symbols.',
          }}
          disabled={loading}
          onChange={(value) =>
            handleChangeFormField('newPassword', value as string)
          }
          onValid={(valid) => handleChangeValidFormField('newPassword', valid)}
          required
        />
        <TextField
          id="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          value={formFields.confirmPassword}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          regex={{
            value: PASSWORD_REGEX,
            message:
              'Must include at least ≥2 uppercase, ≥2 lowercase, ≥2 digits, ≥2 symbols.',
          }}
          disabled={loading}
          onChange={(value) =>
            handleChangeFormField('confirmPassword', value as string)
          }
          onValid={(valid) =>
            handleChangeValidFormField('confirmPassword', valid)
          }
          onAdditionalValidation={(value) => {
            if (value !== formFields.newPassword)
              return 'Password must equal the new password.' as const
            return true
          }}
          required
        />
        <Button
          id="update-password-button"
          type="submit"
          kind="call-to-action"
          size="normal"
          value="Lock It Down!"
          icon={faLock}
          loading={loading}
          disabled={!isFormValid || loading}
        />
      </form>
    </>
  )
}

export default UserPasswordForm
