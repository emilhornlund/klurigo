import { useQuery } from '@tanstack/react-query'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { useAuthContext } from '../../context/auth'

import { QuizDetailsPageUI } from './components'

const QuizDetailsPage: FC = () => {
  const navigate = useNavigate()

  const { quizId } = useParams<{ quizId: string }>()

  const { user } = useAuthContext()

  const { getQuiz, deleteQuiz, createGame, authenticateGame } =
    useKlurigoServiceClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => getQuiz(quizId as string),
    enabled: !!quizId,
    retry: false,
  })

  useEffect(() => {
    if (isError) {
      navigate(-1)
    }
  }, [isError, navigate])

  const isOwner = useMemo(
    () => data?.author.id === user?.ACCESS.sub,
    [data, user],
  )

  const [isHostGameLoading, setIsHostGameLoading] = useState(false)

  const handleCreateGame = (): void => {
    if (quizId) {
      setIsHostGameLoading(true)
      createGame(quizId)
        .then(({ id: gameId }) =>
          authenticateGame({ gameId }).then(() => navigate('/game')),
        )
        .finally(() => setIsHostGameLoading(false))
    }
  }

  const handleEditQuiz = () => {
    if (quizId) {
      navigate(`/quiz/details/${quizId}/edit`)
    }
  }

  const [isDeleteQuizLoading, setIsDeleteQuizLoading] = useState(false)

  const handleDeleteQuiz = (): void => {
    if (quizId) {
      setIsDeleteQuizLoading(true)
      deleteQuiz(quizId)
        .then(() => navigate('/profile/quizzes'))
        .finally(() => setIsDeleteQuizLoading(false))
    }
  }

  return (
    <QuizDetailsPageUI
      quiz={data}
      isOwner={isOwner}
      isLoadingQuiz={isLoading}
      isHostGameLoading={isHostGameLoading}
      isDeleteQuizLoading={isDeleteQuizLoading}
      onHostGame={handleCreateGame}
      onEditQuiz={handleEditQuiz}
      onDeleteQuiz={handleDeleteQuiz}
    />
  )
}

export default QuizDetailsPage
