import type {
  AuthResponseDto,
  TokenDto,
  UserProfileResponseDto,
} from '@klurigo/common'
import type { Page } from '@playwright/test'
import { jwtDecode } from 'jwt-decode'

import { E2E_API_BASE_URL, E2E_USER_PASSWORD } from '../e2e-runtime'

type StoredTokenPayload = Pick<TokenDto, 'sub' | 'exp' | 'authorities'> & {
  token: string
}

type StoredAuthState = {
  USER: {
    ACCESS: StoredTokenPayload
    REFRESH: StoredTokenPayload
  }
}

type StoredCurrentUser = Pick<
  UserProfileResponseDto,
  'id' | 'email' | 'unverifiedEmail' | 'defaultNickname' | 'authProvider'
>

/**
 * Authenticates through the public API and hydrates the browser's normal auth
 * storage without exercising the login UI.
 */
export async function authenticatePageThroughApi(
  page: Page,
  email: string,
): Promise<void> {
  const baseUrl = E2E_API_BASE_URL.replace(/\/+$/, '')
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: E2E_USER_PASSWORD }),
  })

  if (!loginResponse.ok) {
    throw new Error(`Login failed with HTTP ${loginResponse.status}`)
  }

  const { accessToken, refreshToken } =
    (await loginResponse.json()) as AuthResponseDto
  const profileResponse = await fetch(`${baseUrl}/profile/user`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!profileResponse.ok) {
    throw new Error(`Profile lookup failed with HTTP ${profileResponse.status}`)
  }

  const profile = (await profileResponse.json()) as UserProfileResponseDto
  const authState: StoredAuthState = {
    USER: {
      ACCESS: decodeToken(accessToken),
      REFRESH: decodeToken(refreshToken),
    },
  }
  const currentUser: StoredCurrentUser = {
    id: profile.id,
    email: profile.email,
    unverifiedEmail: profile.unverifiedEmail,
    defaultNickname: profile.defaultNickname,
    authProvider: profile.authProvider,
  }

  await page.goto('/')
  await page.evaluate(
    ({ authState: state, currentUser: user }) => {
      window.localStorage.setItem('auth', JSON.stringify(state))
      window.localStorage.setItem('currentUser', JSON.stringify(user))
    },
    { authState, currentUser },
  )
  await page.reload()
}

function decodeToken(token: string): StoredTokenPayload {
  const { sub, exp, authorities } = jwtDecode<TokenDto>(token)
  return { sub, exp, authorities, token }
}
