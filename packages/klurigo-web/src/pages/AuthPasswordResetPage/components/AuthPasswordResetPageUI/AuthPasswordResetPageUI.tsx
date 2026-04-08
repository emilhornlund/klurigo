import { faLock, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { AuthPasswordResetRequestDto } from '@klurigo/common'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
} from '@klurigo/common'
import type { FC, FormEvent } from 'react'
import { useMemo, useState } from 'react'

import {
  Badge,
  Button,
  Page,
  TextField,
  Typography,
} from '../../../../components'
import styles from '../../../../styles/form.module.scss'

export type AuthPasswordResetFormFields = AuthPasswordResetRequestDto

type AuthPasswordResetWithConfirmationFormFields =
  AuthPasswordResetFormFields & {
    confirmPassword: string
  }

export interface AuthPasswordResetPageUIProps {
  loading: boolean
  error: boolean
  onSubmit: (values: AuthPasswordResetFormFields) => void
}

const AuthPasswordResetPageUI: FC<AuthPasswordResetPageUIProps> = ({
  loading,
  error,
  onSubmit,
}) => {
  const [formFields, setFormFields] =
    useState<AuthPasswordResetWithConfirmationFormFields>({
      password: '',
      confirmPassword: '',
    })

  const handleChangeFormField = <
    K extends keyof AuthPasswordResetWithConfirmationFormFields,
  >(
    key: K,
    value: AuthPasswordResetWithConfirmationFormFields[K],
  ) => {
    setFormFields({ ...formFields, [key]: value })
  }

  const [validFormFields, setValidFormFields] = useState<{
    [key in keyof AuthPasswordResetWithConfirmationFormFields]: boolean
  }>({
    password: false,
    confirmPassword: false,
  })

  const isFormValid = useMemo(
    () => Object.values(validFormFields).every((valid) => !!valid),
    [validFormFields],
  )

  const handleChangeValidFormField = <
    K extends keyof AuthPasswordResetWithConfirmationFormFields,
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
    onSubmit({ password: formFields.password })
  }

  if (error) {
    return (
      <Page>
        <Badge size="large" backgroundColor="red">
          <FontAwesomeIcon icon={faXmark} />
        </Badge>

        <Typography variant="title" width="small">
          Oops! Something went wrong.
        </Typography>

        <Typography variant="body" width="medium">
          The supplied link is invalid or has expired.
        </Typography>
      </Page>
    )
  }

  return (
    <Page>
      <Typography variant="title">Lock It Down!</Typography>
      <Typography variant="body" width="medium">
        Choose your dazzling new password and confirm it below. Let’s keep those
        sneaky hackers out!
      </Typography>
      <form className={styles.form} onSubmit={handleSubmit}>
        <TextField
          id="password"
          type="password"
          placeholder="New Password"
          value={formFields.password}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          regex={{
            value: PASSWORD_REGEX,
            message:
              'Must include at least ≥2 uppercase, ≥2 lowercase, ≥2 digits, ≥2 symbols.',
          }}
          disabled={loading}
          onChange={(value) =>
            handleChangeFormField('password', value as string)
          }
          onValid={(valid) => handleChangeValidFormField('password', valid)}
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
            if (value !== formFields.password)
              return 'Password must equal the new password.' as const
            return true
          }}
          required
        />
        <Button
          id="reset-password-button"
          type="submit"
          kind="call-to-action"
          size="normal"
          value="Lock It Down!"
          icon={faLock}
          loading={loading}
          disabled={!isFormValid || loading}
        />
      </form>
    </Page>
  )
}

export default AuthPasswordResetPageUI
