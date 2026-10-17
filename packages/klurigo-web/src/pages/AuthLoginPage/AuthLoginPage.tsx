import * as Sentry from '@sentry/react'
import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { ApiError } from '../../api/api.utils'
import config from '../../config'
import { notifyError } from '../../utils/notification'
import {
  generateRandomString,
  GOOGLE_OAUTH_STORAGE_KEY,
  GOOGLE_OAUTH_STORAGE_PKCE_VERIFIER_KEY,
  GOOGLE_OAUTH_STORAGE_STATE_KEY,
  sha256,
} from '../../utils/oauth'

import type { LoginFormFields } from './components'
import { AuthLoginPageUI } from './components'

const AuthLoginPage: FC = () => {
  const { login } = useKlurigoServiceClient()

  const navigate = useNavigate()
  const location = useLocation()
  const hasShownGoogleOAuthErrorRef = useRef(false)

  useEffect(() => {
    const navigationState = location.state as {
      googleOAuthError?: unknown
    } | null

    if (
      navigationState?.googleOAuthError !== true ||
      hasShownGoogleOAuthErrorRef.current
    ) {
      return
    }

    hasShownGoogleOAuthErrorRef.current = true
    notifyError('Google OAuth error. Please try again.')
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (values: LoginFormFields) => {
    setIsLoading(true)
    login({ email: values.email, password: values.password })
      .then(() => {
        navigate('/')
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 400) {
          return
        }

        Sentry.captureException(error)
      })
      .finally(() => setIsLoading(false))
  }

  const handleGoogleLogin = async (): Promise<void> => {
    const state = generateRandomString(48)
    const pkceVerifier = generateRandomString(64)

    sessionStorage.setItem(
      GOOGLE_OAUTH_STORAGE_KEY,
      JSON.stringify({
        [GOOGLE_OAUTH_STORAGE_STATE_KEY]: state,
        [GOOGLE_OAUTH_STORAGE_PKCE_VERIFIER_KEY]: pkceVerifier,
      }),
    )

    const codeChallenge = await sha256(pkceVerifier)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: Record<string, any> = new URLSearchParams()
    params.append('client_id', config.googleClientId)
    params.append('redirect_uri', config.googleRedirectUri)
    params.append('response_type', 'code')
    params.append('scope', ['openid', 'profile', 'email'].join(' '))
    params.append('state', state)
    params.append('code_challenge', codeChallenge)
    params.append('code_challenge_method', 'S256')

    window.location.href = `https://accounts.google.com/o/oauth2/auth?${params}`
  }

  return (
    <AuthLoginPageUI
      loading={isLoading}
      onSubmit={handleSubmit}
      onGoogleClick={handleGoogleLogin}
    />
  )
}

export default AuthLoginPage
