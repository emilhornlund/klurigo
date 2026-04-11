import type { CreateUserRequestDto } from '@klurigo/common'
import {
  EMAIL_MAX_LENGTH,
  EMAIL_MIN_LENGTH,
  EMAIL_REGEX,
  FAMILY_NAME_MAX_LENGTH,
  FAMILY_NAME_MIN_LENGTH,
  FAMILY_NAME_REGEX,
  GIVEN_NAME_MAX_LENGTH,
  GIVEN_NAME_MIN_LENGTH,
  GIVEN_NAME_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
} from '@klurigo/common'
import type { FC, FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  IconButtonArrowRight,
  Page,
  TextField,
  Typography,
} from '../../../../components'
import NicknameTextField from '../../../../components/NicknameTextField'

import styles from './AuthRegisterPageUI.module.scss'
import { getMessage, getTitle } from './text.utils'

export type CreateUserFormFields = CreateUserRequestDto

type CreateUserValidFormFields = {
  [key in keyof CreateUserFormFields]: boolean
}

export interface AuthRegisterPageUIProps {
  loading: boolean
  onSubmit: (values: CreateUserFormFields) => void
}

const AuthRegisterPageUI: FC<AuthRegisterPageUIProps> = ({
  loading,
  onSubmit,
}) => {
  const title = useMemo(() => getTitle(), [])
  const message = useMemo(() => getMessage(), [])

  const [formFields, setFormFields] = useState<CreateUserFormFields>({
    email: '',
    password: '',
    givenName: '',
    familyName: '',
    defaultNickname: '',
  })

  const handleChangeFormField = <K extends keyof CreateUserRequestDto>(
    key: K,
    value: CreateUserFormFields[K],
  ) => {
    setFormFields({ ...formFields, [key]: value })
  }

  const [validFormFields, setValidFormFields] =
    useState<CreateUserValidFormFields>({
      email: false,
      password: false,
      givenName: false,
      familyName: false,
      defaultNickname: false,
    })

  const isFormValid = useMemo(
    () => Object.values(validFormFields).every((valid) => !!valid),
    [validFormFields],
  )

  const handleChangeValidFormField = <
    K extends keyof CreateUserValidFormFields,
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
    onSubmit({
      ...formFields,
      givenName: formFields.givenName || undefined,
      familyName: formFields.familyName || undefined,
      defaultNickname: formFields.defaultNickname,
    })
  }

  return (
    <Page align="start">
      <Typography variant="title" width="medium">
        {title}
      </Typography>
      <Typography variant="body" width="small">
        {message}
      </Typography>
      <form className={styles.createUserForm} onSubmit={handleSubmit}>
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
        <TextField
          id="givenName"
          type="text"
          placeholder="Given Name"
          value={formFields.givenName}
          minLength={GIVEN_NAME_MIN_LENGTH}
          maxLength={GIVEN_NAME_MAX_LENGTH}
          regex={GIVEN_NAME_REGEX}
          disabled={loading}
          onChange={(value) =>
            handleChangeFormField('givenName', value as string)
          }
          onValid={(valid) => handleChangeValidFormField('givenName', valid)}
        />
        <TextField
          id="familyName"
          type="text"
          placeholder="Family Name"
          value={formFields.familyName}
          minLength={FAMILY_NAME_MIN_LENGTH}
          maxLength={FAMILY_NAME_MAX_LENGTH}
          regex={FAMILY_NAME_REGEX}
          disabled={loading}
          onChange={(value) =>
            handleChangeFormField('familyName', value as string)
          }
          onValid={(valid) => handleChangeValidFormField('familyName', valid)}
        />
        <NicknameTextField
          value={formFields.defaultNickname}
          disabled={loading}
          onChange={(value) => handleChangeFormField('defaultNickname', value)}
          onValid={(valid) =>
            handleChangeValidFormField('defaultNickname', valid)
          }
        />
        <IconButtonArrowRight
          id="join"
          type="submit"
          kind="call-to-action"
          value="Let's go!"
          loading={loading}
          disabled={!isFormValid || loading}
        />
      </form>
      <Typography variant="link" width="small" asChild>
        <Link to={'/auth/login'}>
          Got an account? Flash your credentials and come on in!
        </Link>
      </Typography>
    </Page>
  )
}

export default AuthRegisterPageUI
