import {
  AuthProvider,
  type CrittersAvatarConfigurationV1,
  DEFAULT_CRITTERS_AVATAR_V1,
} from '@klurigo/common'
import { act, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProfileSettingsPage from './ProfileSettingsPage'

type Profile = {
  id: string
  email: string
  unverifiedEmail?: string
  givenName?: string
  familyName?: string
  defaultNickname: string
  authProvider: AuthProvider
  avatar?: CrittersAvatarConfigurationV1
}

type ProfileSettingsPageUIProps = {
  avatar?: CrittersAvatarConfigurationV1
  onChangeAvatar: (
    avatar: CrittersAvatarConfigurationV1,
  ) => Promise<CrittersAvatarConfigurationV1>
  authProvider: AuthProvider
  values: {
    email: string
    unverifiedEmail?: string
    givenName?: string
    familyName?: string
    defaultNickname: string
  }
  loading: boolean
  loadingPassword: boolean
  onChange: (request: ProfileSettingsPageUIProps['values']) => void
  onChangePassword: (request: {
    oldPassword: string
    newPassword: string
  }) => void
  onClickResendVerificationEmail: () => void
}

const h = vi.hoisted(() => ({
  getUserProfile: vi.fn(),
  updateUserAvatar: vi.fn(),
  cancelQueries: vi.fn().mockResolvedValue(undefined),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  auth: { user: { ACCESS: { sub: 'user-1' } }, isUserAuthenticated: true },
  updateUserProfile: vi.fn(),
  updateUserPassword: vi.fn(),
  resendVerificationEmail: vi.fn(),
  refetch: vi.fn(),
  setCurrentUser: vi.fn(),
  queryOptions: undefined as { queryFn: () => Promise<Profile> } | undefined,
  queryState: {
    data: undefined as Profile | undefined,
    isLoading: false,
    isError: false,
  },
  uiProps: undefined as ProfileSettingsPageUIProps | undefined,
}))

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    getUserProfile: h.getUserProfile,
    updateUserAvatar: h.updateUserAvatar,
    updateUserProfile: h.updateUserProfile,
    updateUserPassword: h.updateUserPassword,
    resendVerificationEmail: h.resendVerificationEmail,
  }),
}))

vi.mock('../../context/user', () => ({
  useUserContext: () => ({ setCurrentUser: h.setCurrentUser }),
}))

vi.mock('../../context/auth', () => ({ useAuthContext: () => h.auth }))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    cancelQueries: h.cancelQueries,
    setQueryData: h.setQueryData,
    invalidateQueries: h.invalidateQueries,
  }),
  useQuery: (options: { queryFn: () => Promise<Profile> }) => {
    h.queryOptions = options
    return { ...h.queryState, refetch: h.refetch }
  },
}))

vi.mock('../../components', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
  Typography: ({ children }: { children: ReactNode }) => (
    <p role="alert">{children}</p>
  ),
  Button: ({ children }: { children: ReactNode }) => (
    <button>{children}</button>
  ),
  Page: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('./components', () => ({
  ProfileSettingsPageUI: (props: ProfileSettingsPageUIProps) => {
    h.uiProps = props
    return <div data-testid="profile-settings-ui" />
  },
}))

const localProfile: Profile = {
  id: 'user-1',
  email: 'user@example.com',
  unverifiedEmail: 'pending@example.com',
  givenName: 'Jane',
  familyName: 'Doe',
  defaultNickname: 'QuizFox',
  authProvider: AuthProvider.Local,
}

describe('ProfileSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.queryOptions = undefined
    h.uiProps = undefined
    h.queryState = { data: localProfile, isLoading: false, isError: false }
    h.getUserProfile.mockResolvedValue(localProfile)
    h.auth.user.ACCESS.sub = 'user-1'
    h.updateUserAvatar.mockImplementation(async (avatar) => avatar)
    h.updateUserProfile.mockResolvedValue(localProfile)
    h.updateUserPassword.mockResolvedValue(undefined)
    h.resendVerificationEmail.mockResolvedValue(undefined)
    h.refetch.mockResolvedValue(undefined)
  })

  it('keeps loaded forms mounted during background errors', () => {
    h.queryState = { data: undefined, isLoading: true, isError: false }
    const view = render(<ProfileSettingsPage />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

    h.queryState = { data: undefined, isLoading: false, isError: false }
    view.rerender(<ProfileSettingsPage />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

    h.queryState = { data: localProfile, isLoading: false, isError: true }
    view.rerender(<ProfileSettingsPage />)
    expect(screen.getByTestId('profile-settings-ui')).toBeInTheDocument()
  })

  it('loads the profile and updates local user details with normalized names', async () => {
    render(<ProfileSettingsPage />)

    await expect(h.queryOptions?.queryFn()).resolves.toEqual(localProfile)
    expect(h.getUserProfile).toHaveBeenCalledWith(undefined)

    await act(async () => {
      h.uiProps?.onChange({
        email: 'new@example.com',
        unverifiedEmail: undefined,
        givenName: '  New  ',
        familyName: '   ',
        defaultNickname: 'NewFox',
      })
    })

    expect(h.updateUserProfile).toHaveBeenCalledWith({
      authProvider: AuthProvider.Local,
      email: 'new@example.com',
      givenName: 'New',
      familyName: undefined,
      defaultNickname: 'NewFox',
    })
    const updateSnapshot = h.setCurrentUser.mock.calls[0][0]
    expect(updateSnapshot(undefined)).toEqual({
      avatar: null,
      id: localProfile.id,
      email: localProfile.email,
      unverifiedEmail: localProfile.unverifiedEmail,
      defaultNickname: localProfile.defaultNickname,
      authProvider: localProfile.authProvider,
    })
    expect(h.cancelQueries).toHaveBeenCalledWith({
      queryKey: ['myUserProfile', 'user-1'],
    })
    await waitFor(() => expect(h.uiProps?.loading).toBe(false))
  })

  it('limits Google profile updates and delegates password and email actions', async () => {
    h.queryState = {
      data: { ...localProfile, authProvider: AuthProvider.Google },
      isLoading: false,
      isError: false,
    }
    render(<ProfileSettingsPage />)

    await act(async () => {
      h.uiProps?.onChange({
        email: 'ignored@example.com',
        givenName: 'Ignored',
        familyName: 'Ignored',
        defaultNickname: 'GoogleFox',
      })
      h.uiProps?.onChangePassword({ oldPassword: 'old', newPassword: 'new' })
      h.uiProps?.onClickResendVerificationEmail()
    })

    expect(h.updateUserProfile).toHaveBeenCalledWith({
      authProvider: AuthProvider.Google,
      defaultNickname: 'GoogleFox',
    })
    expect(h.updateUserPassword).toHaveBeenCalledWith({
      oldPassword: 'old',
      newPassword: 'new',
    })
    expect(h.resendVerificationEmail).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(h.uiProps?.loading).toBe(false)
      expect(h.uiProps?.loadingPassword).toBe(false)
    })
  })

  it('merges only the avatar and keeps details props stable on avatar updates', async () => {
    const view = render(<ProfileSettingsPage />)
    const values = h.uiProps?.values
    await act(async () => {
      await h.uiProps?.onChangeAvatar(DEFAULT_CRITTERS_AVATAR_V1)
    })
    expect(h.updateUserAvatar).toHaveBeenCalledWith(DEFAULT_CRITTERS_AVATAR_V1)
    const updateSnapshot = h.setCurrentUser.mock.calls[0][0]
    expect(updateSnapshot(localProfile)).toEqual({
      ...localProfile,
      avatar: DEFAULT_CRITTERS_AVATAR_V1,
    })
    expect(updateSnapshot(undefined)).toEqual({
      id: localProfile.id,
      email: localProfile.email,
      unverifiedEmail: localProfile.unverifiedEmail,
      defaultNickname: localProfile.defaultNickname,
      authProvider: localProfile.authProvider,
      avatar: DEFAULT_CRITTERS_AVATAR_V1,
    })
    expect(h.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['user-profile', 'user-1'],
    })
    const merge = h.setQueryData.mock.calls[0][1]
    expect(merge(localProfile)).toEqual({
      ...localProfile,
      avatar: DEFAULT_CRITTERS_AVATAR_V1,
    })
    h.queryState = {
      ...h.queryState,
      data: { ...localProfile, avatar: DEFAULT_CRITTERS_AVATAR_V1 } as Profile,
    }
    view.rerender(<ProfileSettingsPage />)
    expect(h.uiProps?.values).toBe(values)
  })

  it('ignores a completed avatar save after account switching', async () => {
    let finish!: (avatar: CrittersAvatarConfigurationV1) => void
    h.updateUserAvatar.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const view = render(<ProfileSettingsPage />)
    let pending!: Promise<CrittersAvatarConfigurationV1>
    act(() => {
      pending = h.uiProps!.onChangeAvatar(DEFAULT_CRITTERS_AVATAR_V1)
    })
    h.auth.user.ACCESS.sub = 'user-2'
    view.rerender(<ProfileSettingsPage />)
    await act(async () => {
      finish(DEFAULT_CRITTERS_AVATAR_V1)
      await pending
    })
    expect(h.setQueryData).not.toHaveBeenCalled()
    expect(h.setCurrentUser).not.toHaveBeenCalled()
  })

  it('preserves a newer navigation avatar when a details response contains older metadata', async () => {
    const latest = { ...DEFAULT_CRITTERS_AVATAR_V1, top: null }
    h.updateUserProfile.mockResolvedValue({
      ...localProfile,
      avatar: DEFAULT_CRITTERS_AVATAR_V1,
    })
    render(<ProfileSettingsPage />)
    await act(async () => {
      h.uiProps!.onChange({ ...localProfile, defaultNickname: 'Changed' })
    })
    const updateSnapshot = h.setCurrentUser.mock.calls[0][0]
    expect(updateSnapshot({ ...localProfile, avatar: latest }).avatar).toEqual(
      latest,
    )
  })

  it('does not restore user state when a details save completes after leaving settings', async () => {
    let finish!: (profile: Profile) => void
    const pending = new Promise<Profile>((resolve) => {
      finish = resolve
    })
    h.updateUserProfile.mockReturnValue(pending)
    const view = render(<ProfileSettingsPage />)
    act(() => {
      h.uiProps!.onChange(localProfile)
    })
    view.unmount()
    await act(async () => {
      finish(localProfile)
      await pending
    })
    expect(h.setCurrentUser).not.toHaveBeenCalled()
    expect(h.setQueryData).not.toHaveBeenCalled()
  })
})
