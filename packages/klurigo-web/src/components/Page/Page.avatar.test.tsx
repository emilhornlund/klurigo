import {
  Authority,
  AuthProvider,
  DEFAULT_CRITTERS_AVATAR_V1,
} from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthContext } from '../../context/auth/auth-context'
import {
  type CurrentUserProfile,
  UserContext,
} from '../../context/user/UserContext'
import { getCrittersAvatarV1DataUri } from '../../utils/avatar/critters-v1'
import { DeviceType } from '../../utils/device-size.types'
import PlayerAvatar from '../PlayerAvatar'

import Page from './Page'

const h = vi.hoisted(() => ({ mobile: false }))
vi.mock('../../utils/useDeviceSizeType', () => ({
  useDeviceSizeType: () => (h.mobile ? DeviceType.Mobile : DeviceType.Desktop),
}))

const token = {
  sub: 'user-1',
  exp: 9999999999,
  token: 'access-token',
  authorities: [Authority.User],
}
const auth = {
  user: { ACCESS: token, REFRESH: token },
  isUserAuthenticated: true,
  isGameAuthenticated: false,
  setTokenPair: vi.fn(),
  revokeUser: vi.fn().mockResolvedValue(undefined),
  revokeGame: vi.fn().mockResolvedValue(undefined),
}
const savedAvatar = { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'block' as const }
const snapshot: CurrentUserProfile = {
  id: 'user-1',
  email: 'user@example.com',
  defaultNickname: 'Player',
  authProvider: AuthProvider.Local,
  avatar: savedAvatar,
}

function renderNavigation(
  currentUser: CurrentUserProfile | undefined = snapshot,
  authenticated = true,
) {
  const fetchCurrentUser = vi.fn().mockResolvedValue(undefined)
  const content = (user: CurrentUserProfile | undefined) => (
    <AuthContext.Provider
      value={{ ...auth, isUserAuthenticated: authenticated }}>
      <UserContext.Provider
        value={{
          currentUser: user,
          fetchCurrentUser,
          setCurrentUser: vi.fn(),
          clearCurrentUser: vi.fn(),
        }}>
        <MemoryRouter>
          <Page layout="contained" profile discover>
            <PlayerAvatar
              avatar={DEFAULT_CRITTERS_AVATAR_V1}
              alt="Profile summary avatar"
            />
          </Page>
        </MemoryRouter>
      </UserContext.Provider>
    </AuthContext.Provider>
  )
  return { ...render(content(currentUser)), content, fetchCurrentUser }
}

describe('Page avatar navigation', () => {
  beforeEach(() => {
    h.mobile = false
    vi.clearAllMocks()
  })

  it('shows the saved avatar in desktop navigation and the profile menu without inline SVG collisions', () => {
    const { container } = renderNavigation()
    const button = screen.getByRole('button', {
      name: 'Profile',
      expanded: false,
    })
    expect(button.querySelector('img')).toHaveAttribute(
      'src',
      getCrittersAvatarV1DataUri(savedAvatar),
    )
    fireEvent.click(button)
    expect(
      screen.getByRole('button', { name: 'Profile', expanded: true }),
    ).toBeInTheDocument()
    expect(
      container.querySelectorAll('img[src^="data:image/svg+xml"]'),
    ).toHaveLength(3)
  })

  it('keeps the mobile Menu trigger and displays the avatar in its Profile entry', async () => {
    h.mobile = true
    renderNavigation()
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const entry = await screen.findByRole('button', { name: 'Profile' })
    expect(entry.querySelector('img')).toHaveAttribute(
      'src',
      getCrittersAvatarV1DataUri(savedAvatar),
    )
    expect(screen.getByRole('button', { name: 'Discover' })).toBeInTheDocument()
  })

  it('does not display another account’s persisted avatar', () => {
    renderNavigation({ ...snapshot, id: 'another-user' })
    expect(
      screen.getByRole('button', { name: 'Profile' }).querySelector('img'),
    ).toHaveAttribute(
      'src',
      getCrittersAvatarV1DataUri(DEFAULT_CRITTERS_AVATAR_V1),
    )
  })

  it('refreshes legacy snapshots only once for the current token', () => {
    const legacy = {
      id: snapshot.id,
      email: snapshot.email,
      defaultNickname: snapshot.defaultNickname,
      authProvider: snapshot.authProvider,
    }
    const view = renderNavigation(legacy)
    expect(view.fetchCurrentUser).toHaveBeenCalledWith('access-token')
    view.rerender(view.content({ ...legacy }))
    expect(view.fetchCurrentUser).toHaveBeenCalledTimes(1)
  })

  it('displays the default Critter for confirmed absence without repeated hydration', () => {
    const view = renderNavigation({ ...snapshot, avatar: null })
    expect(view.fetchCurrentUser).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Profile' }).querySelector('img'),
    ).toHaveAttribute(
      'src',
      getCrittersAvatarV1DataUri(DEFAULT_CRITTERS_AVATAR_V1),
    )
  })

  it('does not expose account navigation when signed out', () => {
    renderNavigation(snapshot, false)
    expect(
      screen.queryByRole('button', { name: 'Profile' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
  })
})
