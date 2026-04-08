import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import type { AuthLoginRequestDto } from '@klurigo/common'
import {
  EMAIL_MAX_LENGTH,
  EMAIL_MIN_LENGTH,
  EMAIL_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
} from '@klurigo/common'
import type { FC, FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  Button,
  IconButtonArrowRight,
  Page,
  PageDivider,
  TextField,
  Typography,
} from '../../../../components'

import styles from './AuthLoginPageUI.module.scss'
import { getMessage, getTitle } from './text.utils'

export type LoginFormFields = AuthLoginRequestDto

type ValidLoginFormFields = {
  [key in keyof AuthLoginRequestDto]: boolean
}

export interface AuthLoginPageUIProps {
  loading: boolean
  onSubmit: (values: LoginFormFields) => void
  onGoogleClick: () => void
}

const AuthLoginPageUI: FC<AuthLoginPageUIProps> = ({
  loading,
  onSubmit,
  onGoogleClick,
}) => {
  const title = useMemo(() => getTitle(), [])
  const message = useMemo(() => getMessage(), [])

  const [formFields, setFormFields] = useState<LoginFormFields>({
    email: '',
    password: '',
  })

  const handleChangeFormField = <K extends keyof LoginFormFields>(
    key: K,
    value: LoginFormFields[K],
  ) => {
    setFormFields({ ...formFields, [key]: value })
  }

  const [validFormFields, setValidFormFields] = useState<ValidLoginFormFields>({
    email: false,
    password: false,
  })

  const isFormValid = useMemo(
    () => Object.values(validFormFields).every((valid) => !!valid),
    [validFormFields],
  )

  const handleChangeValidFormField = <K extends keyof ValidLoginFormFields>(
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
    onSubmit(formFields)
  }

  return (
    <Page align="start">
      <Typography variant="title" width="medium">
        {title}
      </Typography>
      <Typography variant="body" width="small">
        {message}
      </Typography>
      <form className={styles.loginForm} onSubmit={handleSubmit}>
        <TextField
          id="email"
          type="text"
          placeholder="Email"
          value={formFields.email}
          minLength={EMAIL_MIN_LENGTH}
          maxLength={EMAIL_MAX_LENGTH}
          regex={EMAIL_REGEX}
          disabled={loading}
          onChange={(value) => handleChangeFormField('email', value as string)}
          onValid={(valid) => handleChangeValidFormField('email', valid)}
          required
        />
        <TextField
          id="password"
          type="password"
          placeholder="Password"
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
        <Typography variant="link" width="small" asChild>
          <Link to={'/auth/password/forgot'}>Forgot your password?</Link>
        </Typography>
        <IconButtonArrowRight
          id="login"
          type="submit"
          kind="call-to-action"
          value="Let's go!"
          loading={loading}
          disabled={!isFormValid || loading}
        />
      </form>
      <Typography variant="link" width="small" asChild>
        <Link to={'/auth/register'}>
          New here? Join the fun and create your account!
        </Link>
      </Typography>

      <PageDivider />

      <div className={styles.authProviderButton}>
        <Button
          id="google-login-button"
          type="button"
          kind="primary"
          value="Continue with Google"
          icon={faGoogle}
          iconPosition="leading"
          loading={false}
          onClick={onGoogleClick}
        />
      </div>
    </Page>
  )
}

export default AuthLoginPageUI
