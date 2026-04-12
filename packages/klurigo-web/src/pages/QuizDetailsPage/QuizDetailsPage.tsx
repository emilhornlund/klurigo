import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { useAuthContext } from '../../context/auth'

import { QuizDetailsPageUI } from './components'

const QuizDetailsPage: FC = () => {
  const navigate = useNavigate()

  const queryClient = useQueryClient()

  const { quizId } = useParams<{ quizId: string }>()

  const { user } = useAuthContext()

  const { getQuiz, getQuizRatings, deleteQuiz, createGame, authenticateGame } =
    useKlurigoServiceClient()

  const {
    data: quiz,
    isLoading: isLoadingQuiz,
    isError: isErrorQuiz,
  } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => getQuiz(quizId as string),
    enabled: !!quizId,
    retry: false,
  })

  const {
    data: ratings,
    isLoading: isLoadingRatings,
    isError: isErrorRatings,
  } = useQuery({
    queryKey: ['quiz-ratings', quizId],
    queryFn: () =>
      getQuizRatings(quizId as string, {
        sort: 'updated',
        order: 'asc',
        offset: 0,
        limit: 10,
        commentsOnly: true,
      }),
    enabled: !!quizId,
    retry: false,
  })

  useEffect(() => {
    if (isErrorQuiz) {
      navigate(-1)
    }
  }, [isErrorQuiz, navigate])

  const isOwner = useMemo(
    () => quiz?.author.id === user?.ACCESS.sub,
    [quiz, user],
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
        .then(() =>
          queryClient.invalidateQueries({ queryKey: ['myProfileQuizzes'] }),
        )
        .then(() => navigate('/profile/quizzes'))
        .finally(() => setIsDeleteQuizLoading(false))
    }
  }

  return (
    <QuizDetailsPageUI
      quiz={quiz}
      ratings={isErrorRatings ? [] : ratings?.results}
      isOwner={isOwner}
      isLoadingQuiz={isLoadingQuiz}
      isLoadingRatings={isLoadingRatings}
      isHostGameLoading={isHostGameLoading}
      isDeleteQuizLoading={isDeleteQuizLoading}
      onHostGame={handleCreateGame}
      onEditQuiz={handleEditQuiz}
      onDeleteQuiz={handleDeleteQuiz}
    />
  )
}

export default QuizDetailsPage
