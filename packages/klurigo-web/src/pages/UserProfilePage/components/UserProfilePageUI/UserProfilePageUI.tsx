import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type {
  DiscoveryQuizCardDto,
  PublicUserProfileResponseDto,
} from '@klurigo/common'
import type { FC } from 'react'
import { Link } from 'react-router-dom'

import {
  HorizontalRail,
  LoadingSpinner,
  Page,
  PageDivider,
  QuizDiscoveryCard,
  RailHeader,
  Typography,
} from '../../../../components'
import {
  DATE_FORMATS,
  formatLocalDate,
  formatTimeAgo,
} from '../../../../utils/date.utils'

import styles from './UserProfilePageUI.module.scss'

/**
 * Props for the `UserProfilePageUI` component.
 */
export interface UserProfilePageUIProps {
  readonly userId: string
  readonly profile?: PublicUserProfileResponseDto
  readonly quizzes: readonly DiscoveryQuizCardDto[]
  readonly isLoading: boolean
  readonly isError: boolean
}

/**
 * Compact stat card used by the profile summary grid.
 */
const Card: FC<{
  title: string
  value: string | number
  alt?: string
}> = ({ title, value, alt }) => (
  <div className={styles.card}>
    <Typography variant="body2">{title}</Typography>
    <Typography variant="title3" noOpacity title={alt}>
      {value}
    </Typography>
  </div>
)

/**
 * Presentational UI for the public user profile page.
 *
 * Renders loading and error states, a compact stats grid for the public user
 * summary, and a horizontal quiz rail when public quizzes are available.
 */
const UserProfilePageUI: FC<UserProfilePageUIProps> = ({
  userId,
  profile,
  quizzes,
  isLoading,
  isError,
}) => {
  if (isLoading) {
    return (
      <Page align="start" discover profile>
        <LoadingSpinner />
      </Page>
    )
  }

  if (isError || !profile) {
    return (
      <Page align="center" discover profile>
        <Typography variant="body" data-testid="user-profile-error-state">
          This user profile is not available right now.
        </Typography>
      </Page>
    )
  }

  return (
    <Page align="start" discover profile>
      <Typography variant="title" data-testid="user-profile-nickname">
        {profile.nickname}
      </Typography>

      <div className={styles.stats} data-testid="user-profile-stats">
        <Card title="Quizzes" value={profile.quizzesCount} />
        <Card title="Hosted games" value={profile.hostedGamesCount} />
        <Card title="Played games" value={profile.playedGamesCount} />
        <Card
          title="Joined"
          value={formatTimeAgo(profile.createdAt)}
          alt={`Joined ${formatLocalDate(profile.createdAt, DATE_FORMATS.DATE_TIME_SECONDS)}`}
        />
      </div>

      <PageDivider />

      {quizzes.length === 0 ? (
        <section className={styles.railSection}>
          <Typography variant="body" data-testid="user-profile-empty-rail">
            This user hasn&apos;t shared any quizzes yet.
          </Typography>
        </section>
      ) : (
        <section className={styles.railSection}>
          <RailHeader
            title="Quizzes"
            description={`Browse quizzes created by ${profile.nickname}.`}
            action={
              <Typography variant="link2" width="small" align="right" asChild>
                <Link
                  to={`/users/${userId}/quizzes`}
                  data-testid="user-profile-see-all-link">
                  See all <FontAwesomeIcon icon={faArrowRight} />
                </Link>
              </Typography>
            }
          />

          <HorizontalRail>
            {quizzes.map((quiz) => (
              <QuizDiscoveryCard key={quiz.id} quiz={quiz} />
            ))}
          </HorizontalRail>
        </section>
      )}
    </Page>
  )
}

export default UserProfilePageUI
