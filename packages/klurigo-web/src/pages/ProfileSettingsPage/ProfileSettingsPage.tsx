import {
  AuthProvider,
  type CrittersAvatarConfigurationV1,
  deepEqual,
  isCrittersAvatarConfigurationV1,
  type UserProfileResponseDto,
} from '@klurigo/common'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { FC } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useKlurigoServiceClient } from '../../api'
import { Button, LoadingSpinner, Page, Typography } from '../../components'
import { useAuthContext } from '../../context/auth'
import { useUserContext } from '../../context/user'
import { trimToUndefined } from '../../utils/helpers'

import type { UpdateUserDetailsFormFields } from './components'
import { ProfileSettingsPageUI } from './components'
import type { UpdateUserPasswordFormFields } from './components/ProfileSettingsPageUI/components'

/** Keeps the existing settings flow, with account-scoped avatar persistence. */
const ProfileSettingsPage: FC = () => {
  const {
    getUserProfile,
    updateUserProfile,
    updateUserAvatar,
    updateUserPassword,
    resendVerificationEmail,
  } = useKlurigoServiceClient()

  const { setCurrentUser } = useUserContext()
  const { user, isUserAuthenticated } = useAuthContext()
  const userId = user?.ACCESS.sub
  const activeUserId = useRef(userId)
  activeUserId.current = userId
  const queryClient = useQueryClient()
  const queryKey = ['myUserProfile', userId]

  const [isSavingUserProfile, setIsSavingUserProfile] = useState(false)
  const [isSavingUserPassword, setIsSavingUserPassword] = useState(false)

  useEffect(() => {
    activeUserId.current = userId
    setIsSavingUserProfile(false)
    return () => {
      activeUserId.current = undefined
    }
  }, [userId])

  const {
    data,
    isLoading: isLoadingUserProfile,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => getUserProfile(undefined),
    enabled: isUserAuthenticated && !!userId,
  })

  // Avatar-only cache updates must not reset the sibling details form's draft.
  const values = useMemo(
    () => ({
      email: data?.unverifiedEmail ?? data?.email ?? '',
      unverifiedEmail: data?.unverifiedEmail,
      givenName: data?.givenName,
      familyName: data?.familyName,
      defaultNickname: data?.defaultNickname ?? '',
    }),
    [
      data?.email,
      data?.unverifiedEmail,
      data?.givenName,
      data?.familyName,
      data?.defaultNickname,
    ],
  )

  const handleAvatarChange = async (avatar: CrittersAvatarConfigurationV1) => {
    if (!userId || data?.id !== userId || activeUserId.current !== userId) {
      throw new Error('Account is not ready')
    }

    const saved = await updateUserAvatar(avatar)
    if (activeUserId.current !== userId) {
      throw new Error('Account identity changed')
    }
    if (!isCrittersAvatarConfigurationV1(saved) || !deepEqual(saved, avatar)) {
      throw new Error('Avatar response did not match')
    }

    await queryClient.cancelQueries({ queryKey })
    if (activeUserId.current !== userId) {
      throw new Error('Account identity changed')
    }
    queryClient.setQueryData<UserProfileResponseDto>(queryKey, (previous) =>
      previous ? { ...previous, avatar: saved } : previous,
    )
    const { id, email, unverifiedEmail, defaultNickname, authProvider } = data
    setCurrentUser((previous) =>
      activeUserId.current !== userId
        ? previous
        : {
            ...(previous?.id === id
              ? previous
              : { id, email, unverifiedEmail, defaultNickname, authProvider }),
            avatar: saved,
          },
    )
    await queryClient.invalidateQueries({ queryKey: ['user-profile', userId] })
    if (activeUserId.current !== userId) {
      throw new Error('Account identity changed')
    }
    return saved
  }

  const handleChange = (request: UpdateUserDetailsFormFields): void => {
    if (data?.authProvider && data.id === userId) {
      const ownerId = userId
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
        .then(async (updated) => {
          if (activeUserId.current !== ownerId) return
          await queryClient.cancelQueries({
            queryKey: ['myUserProfile', ownerId],
          })
          if (activeUserId.current !== ownerId) return
          queryClient.setQueryData<UserProfileResponseDto>(
            ['myUserProfile', ownerId],
            (old) => (old ? { ...updated, avatar: old.avatar } : updated),
          )
          const { id, email, unverifiedEmail, defaultNickname, authProvider } =
            updated
          setCurrentUser((previous) =>
            activeUserId.current !== ownerId
              ? previous
              : {
                  id,
                  email,
                  unverifiedEmail,
                  defaultNickname,
                  authProvider,
                  avatar:
                    previous?.id === id
                      ? (previous.avatar ?? null)
                      : (updated.avatar ?? null),
                },
          )
        })
        .catch(() => undefined)
        .finally(() => {
          if (activeUserId.current === ownerId) setIsSavingUserProfile(false)
        })
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

  if (!data && isError) {
    return (
      <Page layout="contained" profile>
        <Typography variant="body" color="inverse" role="alert">
          We couldn’t load your profile. Please try again.
        </Typography>
        <Button
          id="retry-user-profile"
          type="button"
          onClick={() => void refetch()}>
          Try again
        </Button>
      </Page>
    )
  }

  if (!data || isLoadingUserProfile || data.id !== userId) {
    return (
      <Page layout="contained" profile>
        <LoadingSpinner />
      </Page>
    )
  }

  return (
    <ProfileSettingsPageUI
      key={userId}
      avatar={data.avatar}
      onChangeAvatar={handleAvatarChange}
      onRetryProfile={isError ? () => void refetch() : undefined}
      authProvider={data.authProvider}
      values={values}
      loading={isLoadingUserProfile || isSavingUserProfile}
      loadingPassword={isSavingUserPassword}
      onChange={handleChange}
      onChangePassword={handlePasswordChange}
      onClickResendVerificationEmail={handleResendVerificationEmail}
    />
  )
}

export default ProfileSettingsPage
