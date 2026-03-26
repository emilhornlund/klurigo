import { faArrowRotateLeft } from '@fortawesome/free-solid-svg-icons'
import type { DiscoveryQuizCardDto } from '@klurigo/common'
import type { FC } from 'react'

import {
  Button,
  Page,
  QuizDiscoveryCard,
  Typography,
} from '../../../../components'

import { UserQuizzesGridSkeleton } from './components'
import styles from './UserQuizzesPageUI.module.scss'

/**
 * Props for the `UserQuizzesPageUI` component.
 */
export interface UserQuizzesPageUIProps {
  readonly quizzes: readonly DiscoveryQuizCardDto[]
  readonly isLoading: boolean
  readonly isLoadingMore: boolean
  readonly isError: boolean
  readonly hasMore: boolean
  readonly skeletonCount: number
  readonly onLoadMore: () => void
}

/**
 * Renders the public user quizzes page using the same structure and pagination
 * behavior as `ProfileQuizzesPageUI`, while adapting the cards to the
 * public/discovery card presentation used by this feature.
 */
const UserQuizzesPageUI: FC<UserQuizzesPageUIProps> = ({
  quizzes,
  isLoading,
  isLoadingMore,
  isError,
  hasMore,
  skeletonCount,
  onLoadMore,
}) => {
  return (
    <Page align="start" discover profile>
      <Typography variant="title">Public Quiz Shelf</Typography>
      <Typography variant="text" size="medium">
        Browse public quizzes shared by this user.
      </Typography>
      {isError || (!isLoading && quizzes.length === 0) ? (
        <p className={styles.emptyState} data-testid="profile-empty-state">
          {isError
            ? "Oops! This user's quizzes are playing hide-and-seek right now. Please try again."
            : "This user hasn't shared any quizzes yet."}
        </p>
      ) : (
        <>
          <div className={styles.grid} data-testid="profile-quiz-grid">
            {isLoading && quizzes.length === 0
              ? Array.from({ length: skeletonCount }).map((_, i) => (
                  <UserQuizzesGridSkeleton key={i} />
                ))
              : quizzes.map((quiz) => (
                  <QuizDiscoveryCard key={quiz.id} quiz={quiz} />
                ))}
          </div>
          {hasMore && (
            <div className={styles.loadMoreContainer}>
              <Button
                id="load-more-quizzes-button"
                type="button"
                icon={faArrowRotateLeft}
                loading={isLoadingMore}
                onClick={onLoadMore}
                data-testid="load-more-quizzes-button">
                Load more quizzes
              </Button>
            </div>
          )}
        </>
      )}
    </Page>
  )
}

export default UserQuizzesPageUI
