import type { FC } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { reportUnexpectedAuthError } from '../../utils/reportUnexpectedAuthError'

import type { AuthPasswordForgotFormFields } from './components'
import { AuthPasswordForgotPageUI } from './components'

const AuthPasswordForgotPage: FC = () => {
  const navigate = useNavigate()

  const { sendPasswordResetEmail } = useKlurigoServiceClient()

  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (values: AuthPasswordForgotFormFields): void => {
    setIsLoading(true)
    sendPasswordResetEmail({ email: values.email })
      .then(() => navigate('/'))
      .catch(reportUnexpectedAuthError)
      .finally(() => setIsLoading(false))
  }

  return (
    <AuthPasswordForgotPageUI loading={isLoading} onSubmit={handleSubmit} />
  )
}

export default AuthPasswordForgotPage
