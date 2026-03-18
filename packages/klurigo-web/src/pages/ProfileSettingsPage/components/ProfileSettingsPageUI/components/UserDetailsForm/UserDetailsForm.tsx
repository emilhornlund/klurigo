import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons'
import type { UserProfileResponseDto } from '@klurigo/common'
import {
  AuthProvider,
  EMAIL_MAX_LENGTH,
  EMAIL_MIN_LENGTH,
  EMAIL_REGEX,
  FAMILY_NAME_MAX_LENGTH,
  FAMILY_NAME_MIN_LENGTH,
  FAMILY_NAME_REGEX,
  GIVEN_NAME_MAX_LENGTH,
  GIVEN_NAME_MIN_LENGTH,
  GIVEN_NAME_REGEX,
} from '@klurigo/common'
import type { FC, FormEvent, MouseEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { Button, TextField, Typography } from '../../../../../../components'
import NicknameTextField from '../../../../../../components/NicknameTextField'
import styles from '../../../../../../styles/form.module.scss'

export type UpdateUserDetailsFormFields = Pick<
  UserProfileResponseDto,
  'email' | 'unverifiedEmail' | 'givenName' | 'familyName' | 'defaultNickname'
>

export interface UserDetailsFormProps {
  authProvider: AuthProvider
  values: UpdateUserDetailsFormFields
  loading: boolean
  onChange: (request: UpdateUserDetailsFormFields) => void
  onClickResendVerificationEmail: () => void
}

const UserDetailsForm: FC<UserDetailsFormProps> = ({
  authProvider,
  values,
  loading,
  onChange,
  onClickResendVerificationEmail,
}) => {
  const [formFields, setFormFields] =
    useState<UpdateUserDetailsFormFields>(values)

  useEffect(() => {
    setFormFields(values)
  }, [values])

  const handleChangeFormField = <K extends keyof UpdateUserDetailsFormFields>(
    key: K,
    value: UpdateUserDetailsFormFields[K],
  ) => {
    setFormFields({ ...formFields, [key]: value })
  }

  const [validFormFields, setValidFormFields] = useState<{
    [key in keyof UpdateUserDetailsFormFields]: boolean
  }>({
    email: false,
    givenName: false,
    familyName: false,
    defaultNickname: false,
  })

  const isFormValid = useMemo(
    () => Object.values(validFormFields).every((valid) => !!valid),
    [validFormFields],
  )

  const handleChangeValidFormField = <
    K extends keyof UpdateUserDetailsFormFields,
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

  const handleClickResendVerificationEmail = (event: MouseEvent) => {
    event.preventDefault()
    onClickResendVerificationEmail()
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onChange(formFields)
  }

  return (
    <>
      <Typography variant="title">Shape your quiz identity</Typography>
      <Typography variant="text" size="medium">
        Update your personal details to keep your profile up to date. Your
        information helps personalize your quiz experience and lets others
        recognize you during games.
      </Typography>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formField}>
          <TextField
            id="email"
            type="text"
            placeholder="Email"
            value={formFields.email}
            minLength={EMAIL_MIN_LENGTH}
            maxLength={EMAIL_MAX_LENGTH}
            regex={EMAIL_REGEX}
            disabled={loading || authProvider === AuthProvider.Google}
            onChange={(value) =>
              handleChangeFormField('email', value as string)
            }
            onValid={(valid) => handleChangeValidFormField('email', valid)}
            required
          />
          {formFields.unverifiedEmail && (
            <span className={styles.hint}>
              Whoops, your email{' '}
              <i>
                <b>{formFields.unverifiedEmail}</b>
              </i>{' '}
              hasn’t RSVP’d to verification yet!{' '}
              <button
                type="button"
                className={styles.buttonLink}
                onClick={handleClickResendVerificationEmail}>
                Zap me a fresh verification link!
              </button>
            </span>
          )}
        </div>
        <TextField
          id="givenName"
          type="text"
          placeholder="Given Name"
          value={formFields.givenName}
          minLength={GIVEN_NAME_MIN_LENGTH}
          maxLength={GIVEN_NAME_MAX_LENGTH}
          regex={GIVEN_NAME_REGEX}
          disabled={loading || authProvider === AuthProvider.Google}
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
          disabled={loading || authProvider === AuthProvider.Google}
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
        <Button
          id="update-user-button"
          type="submit"
          kind="call-to-action"
          size="normal"
          value="Save!"
          icon={faFloppyDisk}
          loading={loading}
          disabled={!isFormValid || loading}
        />
      </form>
    </>
  )
}

export default UserDetailsForm
