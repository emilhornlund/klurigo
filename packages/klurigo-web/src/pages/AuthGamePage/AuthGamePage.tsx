import type { FC } from 'react'
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { LoadingSpinner, Page } from '../../components'

const AuthGamePage: FC = () => {
  const navigate = useNavigate()

  const [searchParams] = useSearchParams()

  const { authenticateGame } = useKlurigoServiceClient()

  const hasRequestedRef = useRef(false)

  useEffect(() => {
    const gameId = searchParams.get('id') || undefined
    const gamePIN = searchParams.get('pin') || undefined

    if ((!gameId && !gamePIN) || hasRequestedRef.current) return

    hasRequestedRef.current = true

    authenticateGame({ gameId, gamePIN })
      .then(() => {
        navigate('/join')
      })
      .catch(() => {
        navigate('/')
      })
  }, [searchParams, authenticateGame, navigate])

  return (
    <Page layout="contained">
      <LoadingSpinner />
    </Page>
  )
}

export default AuthGamePage
