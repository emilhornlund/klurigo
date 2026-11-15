import {
  type CrittersAvatarConfigurationV1,
  deepEqual,
  isCrittersAvatarConfigurationV1,
  type UserProfileResponseDto,
} from '@klurigo/common'
import { useQueryClient } from '@tanstack/react-query'

import { useKlurigoServiceClient } from '../api'
import { useUserContext } from '../context/user'

/** Identity guard and acknowledgement callback for an account-only avatar save. */
interface AccountAvatarSaveOptions {
  /** Loaded profile belonging to the authenticated account. */
  readonly profile?: UserProfileResponseDto
  /** Remains true only while the initiating account and owner are still active. */
  readonly isCurrentIdentity: () => boolean
  /** Records a confirmed profile write before any cache reconciliation. */
  readonly onAcknowledged?: (avatar: CrittersAvatarConfigurationV1) => void
}

/**
 * Saves through user scope and reconciles only the initiating account's caches.
 *
 * @param options - Loaded owner, liveness guard, and optional acknowledgement sink.
 * @returns A save function resolving to the exact acknowledged design.
 * @throws When saving fails, the response differs, or account ownership changes.
 */
export function useAccountAvatarSave({
  profile,
  isCurrentIdentity,
  onAcknowledged,
}: AccountAvatarSaveOptions) {
  const { updateUserAvatar } = useKlurigoServiceClient()
  const { setCurrentUser } = useUserContext()
  const queryClient = useQueryClient()

  return async (
    avatar: CrittersAvatarConfigurationV1,
  ): Promise<CrittersAvatarConfigurationV1> => {
    if (!profile || !isCurrentIdentity()) {
      throw new Error('Account is not ready')
    }

    const saved = await updateUserAvatar(avatar)

    if (!isCurrentIdentity()) {
      throw new Error('Account identity changed')
    }

    if (!isCrittersAvatarConfigurationV1(saved) || !deepEqual(saved, avatar)) {
      throw new Error('Avatar acknowledgement did not match')
    }

    // Persist confirmation before cache refreshes: the profile write already succeeded.
    onAcknowledged?.(saved)

    const queryKey = ['myUserProfile', profile.id]
    await queryClient.cancelQueries({ queryKey })

    if (!isCurrentIdentity()) {
      throw new Error('Account identity changed')
    }

    queryClient.setQueryData<UserProfileResponseDto>(queryKey, (previous) =>
      previous ? { ...previous, avatar: saved } : previous,
    )
    setCurrentUser((previous) => {
      if (!isCurrentIdentity()) return previous

      const account =
        previous?.id === profile.id
          ? previous
          : {
              id: profile.id,
              email: profile.email,
              unverifiedEmail: profile.unverifiedEmail,
              defaultNickname: profile.defaultNickname,
              authProvider: profile.authProvider,
            }

      return { ...account, avatar: saved }
    })

    await queryClient.invalidateQueries({
      queryKey: ['user-profile', profile.id],
    })

    if (!isCurrentIdentity()) {
      throw new Error('Account identity changed')
    }

    return saved
  }
}
