import {
  AuthProvider,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import type { FC } from 'react'

import { Button, Page, PageDivider, Typography } from '../../../../components'

import type {
  UpdateUserDetailsFormFields,
  UpdateUserPasswordFormFields,
} from './components'
import { UserAvatarForm, UserDetailsForm, UserPasswordForm } from './components'

export interface ProfileSettingsPageUIProps {
  onRetryProfile?: () => void
  avatar?: CrittersAvatarConfigurationV1
  onChangeAvatar: (
    avatar: CrittersAvatarConfigurationV1,
  ) => Promise<CrittersAvatarConfigurationV1>
  authProvider: AuthProvider
  values: UpdateUserDetailsFormFields
  loading: boolean
  loadingPassword: boolean
  onChange: (request: UpdateUserDetailsFormFields) => void
  onChangePassword: (request: UpdateUserPasswordFormFields) => void
  onClickResendVerificationEmail: () => void
}

const ProfileSettingsPageUI: FC<ProfileSettingsPageUIProps> = ({
  avatar,
  onChangeAvatar,
  onRetryProfile,
  authProvider,
  values,
  loading,
  loadingPassword,
  onChange,
  onChangePassword,
  onClickResendVerificationEmail,
}) => (
  <Page layout="contained" align="start" discover profile>
    {onRetryProfile && (
      <>
        <Typography variant="body2" color="inverse" role="alert">
          We couldn’t refresh your profile. Your changes are still here.
        </Typography>
        <Button
          id="retry-profile-refresh"
          type="button"
          variant="outline"
          onClick={onRetryProfile}>
          Try again
        </Button>
      </>
    )}
    <UserDetailsForm
      authProvider={authProvider}
      values={values}
      loading={loading}
      onChange={onChange}
      onClickResendVerificationEmail={onClickResendVerificationEmail}
    />
    <PageDivider />
    <UserAvatarForm value={avatar} onSave={onChangeAvatar} />
    {authProvider === AuthProvider.Local && (
      <>
        <PageDivider />
        <UserPasswordForm
          loading={loadingPassword}
          onChange={onChangePassword}
        />
      </>
    )}
  </Page>
)

export default ProfileSettingsPageUI
