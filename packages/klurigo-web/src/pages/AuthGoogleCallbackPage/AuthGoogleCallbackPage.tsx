import type { FC } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import {
  GOOGLE_OAUTH_STORAGE_KEY,
  GOOGLE_OAUTH_STORAGE_PKCE_VERIFIER_KEY,
  GOOGLE_OAUTH_STORAGE_STATE_KEY,
} from '../../utils/oauth'

import { AuthGoogleCallbackPageUI } from './components'

const AuthGoogleCallbackPage: FC = () => {
  const navigate = useNavigate()

  const { googleExchangeCode } = useKlurigoServiceClient()

  const hasExchangedRef = useRef(false)

  const navigateToLoginWithError = useCallback(
    () => navigate('/auth/login', { state: { googleOAuthError: true } }),
    [navigate],
  )

  const [searchParams] = useSearchParams()
  useEffect(() => {
    if (hasExchangedRef.current) {
      return
    }
    hasExchangedRef.current = true

    const code = searchParams.get('code') || undefined
    const state = searchParams.get('state') || undefined

    const googleOAuthStorage = JSON.parse(
      sessionStorage.getItem(GOOGLE_OAUTH_STORAGE_KEY) || '{}',
    ) as Record<string, string>

    const storedState =
      googleOAuthStorage?.[GOOGLE_OAUTH_STORAGE_STATE_KEY] || undefined
    const codeVerifier =
      googleOAuthStorage?.[GOOGLE_OAUTH_STORAGE_PKCE_VERIFIER_KEY] || undefined

    if (!code || state !== storedState || !codeVerifier) {
      navigateToLoginWithError()
      return
    }

    googleExchangeCode({ code, codeVerifier })
      .then(() => navigate('/'))
      .catch(navigateToLoginWithError)
  }, [searchParams, navigate, navigateToLoginWithError, googleExchangeCode])

  return <AuthGoogleCallbackPageUI />
}

export default AuthGoogleCallbackPage
