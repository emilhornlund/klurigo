import { DEFAULT_CRITTERS_AVATAR_V1 } from '@klurigo/common'
import { act, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserContextType } from './UserContext'
import { UserContext } from './UserContext'
import UserContextProvider from './UserContextProvider'

// --- Mocks ------------------------------------------------------------------

// Share a mock we can control in tests.
const getUserProfileMock = vi.fn()

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    getUserProfile: getUserProfileMock,
  }),
}))

// Clean localStorage and reset mocks between tests.
beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

// Simple helper to capture latest context value on every update.
function renderWithCapture() {
  let latest: UserContextType | null = null

  const Capture = () => (
    <UserContext.Consumer>
      {(value) => {
        latest = value
        return null
      }}
    </UserContext.Consumer>
  )

  render(
    <UserContextProvider>
      <Capture />
    </UserContextProvider>,
  )

  // Return a getter so tests always read the newest value.
  return () => latest as UserContextType
}

const PROFILE_A = {
  id: 'u-1',
  email: 'a@example.com',
  unverifiedEmail: undefined as string | undefined,
  defaultNickname: 'Alpha',
}

const PROFILE_B = {
  id: 'u-2',
  email: 'b@example.com',
  unverifiedEmail: 'b@pending.com',
  defaultNickname: 'Beta',
}

// --- Tests -------------------------------------------------------------------

describe('UserContextProvider', () => {
  it('hydrates and persists avatar metadata alongside the minimal user snapshot', async () => {
    const getCtx = renderWithCapture()
    getUserProfileMock.mockResolvedValueOnce({
      ...PROFILE_A,
      avatar: DEFAULT_CRITTERS_AVATAR_V1,
      givenName: 'Private',
    })
    await act(async () => {
      await getCtx().fetchCurrentUser('avatar-token')
    })
    expect(getCtx().currentUser?.avatar).toEqual(DEFAULT_CRITTERS_AVATAR_V1)
    expect(JSON.parse(localStorage.getItem('currentUser')!).avatar).toEqual(
      DEFAULT_CRITTERS_AVATAR_V1,
    )
    expect(getCtx().currentUser).not.toHaveProperty('givenName')
  })

  it('does not roll back a saved avatar when older hydration completes', async () => {
    const getCtx = renderWithCapture()
    const old = { ...PROFILE_A, avatar: DEFAULT_CRITTERS_AVATAR_V1 }
    getUserProfileMock.mockResolvedValueOnce(old)
    await act(async () => {
      await getCtx().fetchCurrentUser('initial')
    })
    let finish!: (profile: typeof old) => void
    getUserProfileMock.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const pending = getCtx().fetchCurrentUser('slow')
    const saved = { ...DEFAULT_CRITTERS_AVATAR_V1, top: null }
    act(() => {
      getCtx().setCurrentUser((previous) =>
        previous ? { ...previous, avatar: saved } : previous,
      )
    })
    await act(async () => {
      finish(old)
      await pending
    })
    expect(getCtx().currentUser?.avatar).toEqual(saved)
  })

  it('does not restore an account or avatar after logout during hydration', async () => {
    const getCtx = renderWithCapture()
    let finish!: (profile: typeof PROFILE_A) => void
    getUserProfileMock.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const pending = getCtx().fetchCurrentUser('pending')
    act(() => {
      getCtx().clearCurrentUser()
    })
    await act(async () => {
      finish(PROFILE_A)
      await pending
    })
    expect(getCtx().currentUser).toBeUndefined()
  })

  it('keeps the latest account when an earlier hydration fails late', async () => {
    const getCtx = renderWithCapture()
    let fail!: (error: Error) => void
    getUserProfileMock.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        fail = reject
      }),
    )
    const oldRequest = getCtx().fetchCurrentUser('old-account')
    getUserProfileMock.mockResolvedValueOnce({
      ...PROFILE_B,
      avatar: DEFAULT_CRITTERS_AVATAR_V1,
    })
    await act(async () => {
      await getCtx().fetchCurrentUser('new-account')
    })
    await act(async () => {
      fail(new Error('Expired old token'))
      await oldRequest
    })
    expect(getCtx().currentUser?.id).toBe(PROFILE_B.id)
    expect(getCtx().currentUser?.avatar).toEqual(DEFAULT_CRITTERS_AVATAR_V1)
  })

  it('fetches and stores user profile', async () => {
    const getCtx = renderWithCapture()
    getUserProfileMock.mockResolvedValueOnce(PROFILE_A)

    await act(async () => {
      await getCtx().fetchCurrentUser('token-1')
    })

    await waitFor(() => {
      expect(getCtx().currentUser).toEqual({ ...PROFILE_A, avatar: null })
    })
    expect(getUserProfileMock).toHaveBeenCalledTimes(1)
    expect(getUserProfileMock).toHaveBeenCalledWith('token-1')
  })

  it('deduplicates concurrent fetches for the same token (single request)', async () => {
    const getCtx = renderWithCapture()
    getUserProfileMock.mockResolvedValueOnce(PROFILE_A)

    await act(async () => {
      // Fire multiple calls rapidly with the same token.
      await Promise.all([
        getCtx().fetchCurrentUser('token-dup'),
        getCtx().fetchCurrentUser('token-dup'),
        getCtx().fetchCurrentUser('token-dup'),
      ])
    })

    await waitFor(() => {
      expect(getCtx().currentUser).toEqual({ ...PROFILE_A, avatar: null })
    })
    expect(getUserProfileMock).toHaveBeenCalledTimes(1)
  })

  it('allows fetching the same token again after the first request settles (inflight reset)', async () => {
    const getCtx = renderWithCapture()
    getUserProfileMock.mockResolvedValueOnce(PROFILE_A)

    await act(async () => {
      await getCtx().fetchCurrentUser('token-1')
    })

    await waitFor(() => {
      expect(getCtx().currentUser).toEqual({ ...PROFILE_A, avatar: null })
    })
    expect(getUserProfileMock).toHaveBeenCalledTimes(1)

    // After completion, inflight should be cleared -> next call issues a new request.
    getUserProfileMock.mockResolvedValueOnce(PROFILE_A)

    await act(async () => {
      await getCtx().fetchCurrentUser('token-1')
    })

    await waitFor(() => {
      expect(getCtx().currentUser).toEqual({ ...PROFILE_A, avatar: null })
    })

    expect(getUserProfileMock).toHaveBeenCalledTimes(2)
  })

  it('issues separate requests for different tokens', async () => {
    const getCtx = renderWithCapture()
    getUserProfileMock.mockImplementation((t: string) =>
      t === 'tA' ? Promise.resolve(PROFILE_A) : Promise.resolve(PROFILE_B),
    )

    await act(async () => {
      await Promise.all([
        getCtx().fetchCurrentUser('tA'),
        getCtx().fetchCurrentUser('tB'),
      ])
    })

    await waitFor(() => {
      expect(getCtx().currentUser).toEqual({ ...PROFILE_B, avatar: null })
    })
    expect(getUserProfileMock).toHaveBeenCalledTimes(2)
    expect(getUserProfileMock).toHaveBeenCalledWith('tA')
    expect(getUserProfileMock).toHaveBeenCalledWith('tB')
  })

  it('clears currentUser when fetching fails', async () => {
    const getCtx = renderWithCapture()

    // Seed a value first to ensure it gets cleared on error.
    getUserProfileMock.mockResolvedValueOnce(PROFILE_A)
    await act(async () => {
      await getCtx().fetchCurrentUser('ok')
    })
    await waitFor(() =>
      expect(getCtx().currentUser).toEqual({ ...PROFILE_A, avatar: null }),
    )

    // Now fail a fetch and ensure it clears.
    getUserProfileMock.mockRejectedValueOnce(new Error('boom'))
    await act(async () => {
      await getCtx().fetchCurrentUser('bad')
    })

    await waitFor(() => {
      expect(getCtx().currentUser).toBeUndefined()
    })
  })

  it('returns a resolved promise immediately when a same-token request is already in-flight', async () => {
    const getCtx = renderWithCapture()

    let resolveFirst!: (value: typeof PROFILE_A) => void
    const first = new Promise<typeof PROFILE_A>((resolve) => {
      resolveFirst = resolve
    })
    getUserProfileMock.mockReturnValueOnce(first)

    const p1 = getCtx().fetchCurrentUser('t-inflight')
    const p2 = getCtx().fetchCurrentUser('t-inflight')

    expect(getUserProfileMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFirst(PROFILE_A)
      await Promise.all([p1, p2])
    })

    expect(getCtx().currentUser).toEqual({ ...PROFILE_A, avatar: null })
  })
})
