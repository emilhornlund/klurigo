import type { FC } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { reportUnexpectedAuthError } from '../../utils/reportUnexpectedAuthError'

import type { CreateUserFormFields } from './components'
import { AuthRegisterPageUI } from './components'

const AuthRegisterPage: FC = () => {
  const navigate = useNavigate()

  const { login, register } = useKlurigoServiceClient()

  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleSubmit = (values: CreateUserFormFields) => {
    setIsLoading(true)
    register(values)
      .then(() => login({ email: values.email, password: values.password }))
      .then(() => navigate('/'))
      .catch(reportUnexpectedAuthError)
      .finally(() => setIsLoading(false))
  }

  return <AuthRegisterPageUI loading={isLoading} onSubmit={handleSubmit} />
}

export default AuthRegisterPage
