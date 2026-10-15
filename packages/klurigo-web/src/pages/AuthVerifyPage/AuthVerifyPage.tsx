import type { FC } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { useAuthContext } from '../../context/auth'
import { reportUnexpectedAuthError } from '../../utils/reportUnexpectedAuthError'

import { AuthVerifyPageUI } from './components'

const AuthVerifyPage: FC = () => {
  const navigate = useNavigate()

  const { isUserAuthenticated } = useAuthContext()

  const [searchParams] = useSearchParams()

  const { verifyEmail } = useKlurigoServiceClient()

  const [isLoading, setLoading] = useState<boolean>(true)
  const [hasError, setHasError] = useState<boolean>(false)

  const hasVerifiedRef = useRef(false)

  const isVerified = useMemo(
    () => !isLoading && !hasError,
    [isLoading, hasError],
  )

  useEffect(() => {
    const token = searchParams.get('token') || undefined
    if (!token) {
      navigate('/')
    } else if (!hasVerifiedRef.current) {
      hasVerifiedRef.current = true
      setLoading(true)
      verifyEmail(token)
        .then(() => {
          setHasError(false)
        })
        .catch((error) => {
          reportUnexpectedAuthError(error)
          setHasError(true)
        })
        .finally(() => setLoading(false))
    }
  }, [searchParams, navigate, verifyEmail])

  return (
    <AuthVerifyPageUI
      verified={isVerified}
      loggedIn={isUserAuthenticated}
      error={hasError}
    />
  )
}

export default AuthVerifyPage
