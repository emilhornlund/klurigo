import { useQuery } from '@tanstack/react-query'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { toDiscoveryQuizCards } from '../../utils/quiz.utils'

import { UserProfilePageUI } from './components'

const USER_PROFILE_QUIZ_RAIL_LIMIT = 10

/**
 * Container page for rendering a public user profile.
 *
 * Reads the `userId` route parameter, loads the public profile summary and the
 * first page of public quizzes for that user, then adapts the quiz data into
 * the discovery-card shape expected by the page UI.
 */
const UserProfilePage: FC = () => {
  const { userId = '' } = useParams<{ userId: string }>()
  const { getUserPublicProfile, getUserPublicQuizzes } =
    useKlurigoServiceClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const [profile, publicQuizzes] = await Promise.all([
        getUserPublicProfile(userId),
        getUserPublicQuizzes(userId, {
          sort: 'updated',
          order: 'desc',
          limit: USER_PROFILE_QUIZ_RAIL_LIMIT,
          offset: 0,
        }),
      ])

      return {
        profile,
        publicQuizzes,
      }
    },
    enabled: userId.length > 0,
    retry: false,
  })

  const quizzes = useMemo(
    () => toDiscoveryQuizCards(data?.publicQuizzes.results ?? []),
    [data?.publicQuizzes.results],
  )

  return (
    <UserProfilePageUI
      userId={userId}
      profile={data?.profile}
      quizzes={quizzes}
      isLoading={isLoading}
      isError={isError}
    />
  )
}

export default UserProfilePage
