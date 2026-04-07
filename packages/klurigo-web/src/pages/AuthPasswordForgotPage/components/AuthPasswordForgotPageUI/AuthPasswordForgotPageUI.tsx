import type { AuthPasswordForgotRequestDto } from '@klurigo/common'
import {
  EMAIL_MAX_LENGTH,
  EMAIL_MIN_LENGTH,
  EMAIL_REGEX,
} from '@klurigo/common'
import type { FC, FormEvent } from 'react'
import { useMemo, useState } from 'react'

import {
  IconButtonArrowRight,
  Page,
  TextField,
  Typography,
} from '../../../../components'
import styles from '../../../../styles/form.module.scss'

export type AuthPasswordForgotFormFields = AuthPasswordForgotRequestDto

export interface AuthPasswordForgotPageUIProps {
  loading: boolean
  onSubmit: (values: AuthPasswordForgotFormFields) => void
}

type AuthPasswordForgotValidFormFields = {
  [key in keyof AuthPasswordForgotFormFields]: boolean
}

const AuthPasswordForgotPageUI: FC<AuthPasswordForgotPageUIProps> = ({
  loading,
  onSubmit,
}) => {
  const [formFields, setFormFields] = useState<AuthPasswordForgotFormFields>({
    email: '',
  })

  const handleChangeFormField = <K extends keyof AuthPasswordForgotFormFields>(
    key: K,
    value: AuthPasswordForgotFormFields[K],
  ) => {
    setFormFields({ ...formFields, [key]: value })
  }

  const [validFormFields, setValidFormFields] =
    useState<AuthPasswordForgotValidFormFields>({
      email: false,
    })

  const isFormValid = useMemo(
    () => Object.values(validFormFields).every((valid) => !!valid),
    [validFormFields],
  )

  const handleChangeValidFormField = <
    K extends keyof AuthPasswordForgotValidFormFields,
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
    onSubmit({ email: formFields.email })
  }

  return (
    <Page>
      <Typography variant="title">Uh-oh, Lost Your Key?</Typography>
      <Typography variant="text" width="medium">
        Don’t panic – it happens! Drop your email below and we’ll beam you a
        shiny new password link.
      </Typography>
      <form className={styles.form} onSubmit={handleSubmit}>
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
        <IconButtonArrowRight
          id="continue-button"
          type="submit"
          kind="call-to-action"
          value="Send Reset Link"
          loading={loading}
          disabled={!isFormValid || loading}
        />
      </form>
    </Page>
  )
}

export default AuthPasswordForgotPageUI
