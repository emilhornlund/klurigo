import {
  DEFAULT_CRITTERS_AVATAR_V1,
  isCrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getGame,
  getUserProfile,
  updateUserAvatar,
  setCurrentUser,
  cache,
  navigate,
} = vi.hoisted(() => ({
  getGame: vi.fn(),
  getUserProfile: vi.fn(),
  updateUserAvatar: vi.fn(),
  setCurrentUser: vi.fn(),
  cache: {
    cancelQueries: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  },
  navigate: vi.fn(),
}))
let gameID = 'game-1'
let participantId = 'guest-1'
let accountId: string | undefined
vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    getGame,
    getUserProfile,
    updateUserAvatar,
  }),
}))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => cache }))
vi.mock('../../context/user', () => ({
  useUserContext: () => ({ setCurrentUser }),
}))
vi.mock('../../context/game', () => ({
  useGameContext: () => ({ gameID, participantId }),
}))
vi.mock('../../context/auth', () => ({
  useAuthContext: () => ({
    isUserAuthenticated: !!accountId,
    user: accountId ? { ACCESS: { sub: accountId } } : undefined,
  }),
}))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

import { useGameJoinAvatar } from './use-game-join-avatar'

describe('useGameJoinAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    gameID = 'game-1'
    participantId = 'guest-1'
    accountId = undefined
    getGame.mockResolvedValue({ id: gameID })
    getUserProfile.mockResolvedValue({ id: 'account-1', avatar: null })
    updateUserAvatar.mockImplementation(async (avatar) => avatar)
    cache.cancelQueries.mockResolvedValue(undefined)
    cache.invalidateQueries.mockResolvedValue(undefined)
  })

  it('generates one valid guest draft and keeps it across renders and reloads', async () => {
    const first = renderHook(useGameJoinAvatar)
    await waitFor(() => expect(first.result.current.isLoading).toBe(false))
    const avatar = first.result.current.avatar
    expect(isCrittersAvatarConfigurationV1(avatar)).toBe(true)
    first.rerender()
    expect(first.result.current.avatar).toEqual(avatar)
    first.unmount()
    const second = renderHook(useGameJoinAvatar)
    await waitFor(() => expect(second.result.current.isLoading).toBe(false))
    expect(second.result.current.avatar).toEqual(avatar)
    expect(getUserProfile).not.toHaveBeenCalled()
  })

  it('saves an edited account design once and retains the acknowledgement across reloads', async () => {
    accountId = participantId = 'account-1'
    const hook = renderHook(useGameJoinAvatar)
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
    expect(hook.result.current.needsSave).toBe(false)
    const design = {
      ...DEFAULT_CRITTERS_AVATAR_V1,
      body: 'block' as const,
      top: null,
    }
    act(() => hook.result.current.setAvatar(design))
    expect(hook.result.current.needsSave).toBe(true)
    await act(async () =>
      expect(await hook.result.current.commitAvatar()).toEqual(design),
    )
    expect(updateUserAvatar).toHaveBeenCalledExactlyOnceWith(design)
    expect(hook.result.current.hasSavedAccountDesign).toBe(true)
    expect(hook.result.current.needsSave).toBe(false)
    expect(setCurrentUser.mock.lastCall?.[0](undefined)).toMatchObject({
      id: accountId,
      avatar: design,
    })
    expect(cache.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['user-profile', accountId],
    })
    hook.unmount()
    const restored = renderHook(useGameJoinAvatar)
    await waitFor(() => expect(restored.result.current.isLoading).toBe(false))
    expect(restored.result.current.avatar).toEqual(design)
    expect(restored.result.current.needsSave).toBe(false)
    await act(async () =>
      expect(await restored.result.current.commitAvatar()).toEqual(design),
    )
    expect(updateUserAvatar).toHaveBeenCalledTimes(1)
  })

  it('retains a failed account save draft for retry without updating account state', async () => {
    accountId = participantId = 'account-1'
    const hook = renderHook(useGameJoinAvatar)
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
    const design = { ...DEFAULT_CRITTERS_AVATAR_V1, top: null }
    act(() => hook.result.current.setAvatar(design))
    updateUserAvatar.mockRejectedValueOnce(new Error('offline'))
    await act(async () => {
      await expect(hook.result.current.commitAvatar()).rejects.toThrow(
        'offline',
      )
    })
    expect(setCurrentUser).not.toHaveBeenCalled()
    expect(hook.result.current.avatar).toEqual(design)
    expect(hook.result.current.needsSave).toBe(true)
    hook.unmount()
    const restored = renderHook(useGameJoinAvatar)
    await waitFor(() => expect(restored.result.current.isLoading).toBe(false))
    expect(restored.result.current.avatar).toEqual(design)
    await act(async () => {
      await restored.result.current.commitAvatar()
    })
    expect(updateUserAvatar).toHaveBeenCalledTimes(2)
  })

  it('ignores a late save acknowledgement after switching accounts', async () => {
    accountId = participantId = 'account-1'
    const hook = renderHook(useGameJoinAvatar)
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
    const design = { ...DEFAULT_CRITTERS_AVATAR_V1, top: null }
    act(() => hook.result.current.setAvatar(design))
    let acknowledge!: (avatar: typeof design) => void
    updateUserAvatar.mockReturnValueOnce(
      new Promise((resolve) => {
        acknowledge = resolve
      }),
    )
    const pending = hook.result.current.commitAvatar()
    accountId = participantId = 'account-2'
    getUserProfile.mockResolvedValue({ id: accountId, avatar: null })
    hook.rerender()
    await act(async () => {
      acknowledge(design)
      await expect(pending).rejects.toThrow('identity changed')
    })
    expect(setCurrentUser).not.toHaveBeenCalled()
    expect(cache.setQueryData).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(hook.result.current.avatar).toEqual(DEFAULT_CRITTERS_AVATAR_V1),
    )
  })

  it('does not save an unchanged default or a discarded account edit', async () => {
    accountId = participantId = 'account-1'
    const hook = renderHook(useGameJoinAvatar)
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
    act(() =>
      hook.result.current.setAvatar({
        ...DEFAULT_CRITTERS_AVATAR_V1,
        top: null,
      }),
    )
    act(() => hook.result.current.setAvatar(DEFAULT_CRITTERS_AVATAR_V1))
    await act(async () => {
      await hook.result.current.commitAvatar()
    })
    expect(updateUserAvatar).not.toHaveBeenCalled()
  })

  it('scopes edited drafts to game and participant and recovers the original scope', async () => {
    const hook = renderHook(useGameJoinAvatar)
    await waitFor(() => expect(hook.result.current.avatar).toBeDefined())
    act(() => hook.result.current.setAvatar(DEFAULT_CRITTERS_AVATAR_V1))
    participantId = 'guest-2'
    hook.rerender()
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
    expect(
      localStorage.getItem('klurigo:join-avatar:game-1:guest-2:guest'),
    ).not.toBeNull()
    gameID = 'game-2'
    hook.rerender()
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
    expect(
      localStorage.getItem('klurigo:join-avatar:game-2:guest-2:guest'),
    ).not.toBeNull()
    gameID = 'game-1'
    participantId = 'guest-1'
    hook.rerender()
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
    expect(hook.result.current.avatar).toEqual(DEFAULT_CRITTERS_AVATAR_V1)
  })

  it.each([null, { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'block', top: null }])(
    'loads the trusted account saved/default design: %j',
    async (avatar) => {
      accountId = participantId = 'account-1'
      getUserProfile.mockResolvedValue({ id: accountId, avatar })
      const hook = renderHook(useGameJoinAvatar)
      await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
      expect(hook.result.current.avatar).toEqual(
        avatar ?? DEFAULT_CRITTERS_AVATAR_V1,
      )
    },
  )

  it('resumes accepted identities before loading profiles or creating a draft', async () => {
    getGame.mockResolvedValue({
      participant: { avatar: DEFAULT_CRITTERS_AVATAR_V1 },
    })
    renderHook(useGameJoinAvatar)
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/game', { replace: true }),
    )
    expect(localStorage.length).toBe(0)
    expect(getUserProfile).not.toHaveBeenCalled()
  })

  it('resolves unsupported account metadata to the stable default without a profile write', async () => {
    accountId = participantId = 'account-1'
    getUserProfile.mockResolvedValue({ id: accountId, avatar: { version: 99 } })
    const hook = renderHook(useGameJoinAvatar)
    await waitFor(() =>
      expect(hook.result.current.avatar).toEqual(DEFAULT_CRITTERS_AVATAR_V1),
    )
  })

  it('ignores corrupted guest storage and replaces it with one valid draft', async () => {
    localStorage.setItem('klurigo:join-avatar:game-1:guest-1:guest', '{broken')
    const hook = renderHook(useGameJoinAvatar)
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
    expect(isCrittersAvatarConfigurationV1(hook.result.current.avatar)).toBe(
      true,
    )
    expect(
      JSON.parse(
        localStorage.getItem('klurigo:join-avatar:game-1:guest-1:guest')!,
      ),
    ).toEqual(hook.result.current.avatar)
  })

  it('blocks account switches until game authentication matches', async () => {
    accountId = 'account-1'
    const hook = renderHook(useGameJoinAvatar)
    await waitFor(() =>
      expect(hook.result.current.error).toMatch(/account changed/),
    )
    expect(hook.result.current.avatar).toBeUndefined()
    expect(getUserProfile).not.toHaveBeenCalled()
  })

  it('retains drafts across preparation failures and explicit retry', async () => {
    localStorage.setItem(
      'klurigo:join-avatar:game-1:guest-1:guest',
      JSON.stringify(DEFAULT_CRITTERS_AVATAR_V1),
    )
    getGame.mockRejectedValueOnce(new Error('offline'))
    const hook = renderHook(useGameJoinAvatar)
    await waitFor(() => expect(hook.result.current.error).toBeDefined())
    act(() => hook.result.current.retry())
    await waitFor(() =>
      expect(hook.result.current.avatar).toEqual(DEFAULT_CRITTERS_AVATAR_V1),
    )
  })
})
