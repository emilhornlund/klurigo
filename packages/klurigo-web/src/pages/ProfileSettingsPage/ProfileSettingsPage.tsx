import { AuthProvider } from '@klurigo/common'
import { useQuery } from '@tanstack/react-query'
import type { FC } from 'react'
import { useState } from 'react'

import { useKlurigoServiceClient } from '../../api'
import { LoadingSpinner, Page } from '../../components'
import { useUserContext } from '../../context/user'
import { trimToUndefined } from '../../utils/helpers'

import type { UpdateUserDetailsFormFields } from './components'
import { ProfileSettingsPageUI } from './components'
import type { UpdateUserPasswordFormFields } from './components/ProfileSettingsPageUI/components'

const ProfileSettingsPage: FC = () => {
  const {
    getUserProfile,
    updateUserProfile,
    updateUserPassword,
    resendVerificationEmail,
  } = useKlurigoServiceClient()

  const { setCurrentUser } = useUserContext()

  const [isSavingUserProfile, setIsSavingUserProfile] = useState(false)
  const [isSavingUserPassword, setIsSavingUserPassword] = useState(false)

  const {
    data,
    isLoading: isLoadingUserProfile,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['myUserProfile'],
    queryFn: () => getUserProfile(undefined),
  })

  const handleChange = (request: UpdateUserDetailsFormFields): void => {
    if (data?.authProvider) {
      setIsSavingUserProfile(true)
      updateUserProfile({
        ...(data.authProvider === AuthProvider.Local
          ? {
              authProvider: AuthProvider.Local,
              email: request.email,
              givenName: trimToUndefined(request.givenName),
              familyName: trimToUndefined(request.familyName),
              defaultNickname: request.defaultNickname,
            }
          : {
              authProvider: AuthProvider.Google,
              defaultNickname: request.defaultNickname,
            }),
      })
        .then(
          ({ id, email, unverifiedEmail, defaultNickname, authProvider }) => {
            setCurrentUser({
              id,
              email,
              unverifiedEmail,
              defaultNickname,
              authProvider,
            })
          },
        )
        .then(() => refetch())
        .finally(() => setIsSavingUserProfile(false))
    }
  }

  const handlePasswordChange = (
    request: UpdateUserPasswordFormFields,
  ): void => {
    setIsSavingUserPassword(true)
    updateUserPassword(request).finally(() => setIsSavingUserPassword(false))
  }

  const handleResendVerificationEmail = () => {
    resendVerificationEmail().then(() => {})
  }

  if (!data || isLoadingUserProfile || isError) {
    return (
      <Page profile>
        <LoadingSpinner />
      </Page>
    )
  }

  return (
    <ProfileSettingsPageUI
      authProvider={data.authProvider}
      values={{
        email: data.unverifiedEmail ?? data.email,
        unverifiedEmail: data.unverifiedEmail,
        givenName: data.givenName,
        familyName: data.familyName,
        defaultNickname: data.defaultNickname,
      }}
      loading={isLoadingUserProfile || isSavingUserProfile}
      loadingPassword={isSavingUserPassword}
      onChange={handleChange}
      onChangePassword={handlePasswordChange}
      onClickResendVerificationEmail={handleResendVerificationEmail}
    />
  )
}

export default ProfileSettingsPage
