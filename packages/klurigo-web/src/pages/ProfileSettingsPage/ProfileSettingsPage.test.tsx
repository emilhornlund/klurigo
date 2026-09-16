import { AuthProvider } from '@klurigo/common'
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
}

type ProfileSettingsPageUIProps = {
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
    updateUserProfile: h.updateUserProfile,
    updateUserPassword: h.updateUserPassword,
    resendVerificationEmail: h.resendVerificationEmail,
  }),
}))

vi.mock('../../context/user', () => ({
  useUserContext: () => ({ setCurrentUser: h.setCurrentUser }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryFn: () => Promise<Profile> }) => {
    h.queryOptions = options
    return { ...h.queryState, refetch: h.refetch }
  },
}))

vi.mock('../../components', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
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
    h.updateUserProfile.mockResolvedValue(localProfile)
    h.updateUserPassword.mockResolvedValue(undefined)
    h.resendVerificationEmail.mockResolvedValue(undefined)
    h.refetch.mockResolvedValue(undefined)
  })

  it('shows a spinner while the profile is loading, unavailable, or in error', () => {
    h.queryState = { data: undefined, isLoading: true, isError: false }
    const view = render(<ProfileSettingsPage />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

    h.queryState = { data: undefined, isLoading: false, isError: false }
    view.rerender(<ProfileSettingsPage />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

    h.queryState = { data: localProfile, isLoading: false, isError: true }
    view.rerender(<ProfileSettingsPage />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
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
    expect(h.setCurrentUser).toHaveBeenCalledWith({
      id: localProfile.id,
      email: localProfile.email,
      unverifiedEmail: localProfile.unverifiedEmail,
      defaultNickname: localProfile.defaultNickname,
      authProvider: localProfile.authProvider,
    })
    expect(h.refetch).toHaveBeenCalledTimes(1)
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
})
