import { faArrowRotateLeft, faPlus } from '@fortawesome/free-solid-svg-icons'
import type { QuizResponseDto } from '@klurigo/common'
import {
  GameMode,
  LanguageCode,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import type { FC } from 'react'

import { Button, Page, Typography } from '../../../../components'
import QuizTableFilter from '../../../../components/QuizTableFilter'

import { ProfileQuizCard, ProfileQuizCardSkeleton } from './components'
import styles from './ProfileQuizzesPageUI.module.scss'

/**
 * Search and filter parameters used by the `ProfileQuizzesPageUI` component.
 */
export interface ProfileQuizzesPageUISearchParams {
  /** The free-text search term used to filter quizzes. */
  readonly search?: string
  /** The quiz visibility filter. */
  readonly visibility?: QuizVisibility
  /** The quiz category filter. */
  readonly category?: QuizCategory
  /** The quiz language filter. */
  readonly languageCode?: LanguageCode
  /** The quiz mode filter. */
  readonly mode?: GameMode
  /** The field used to sort the quizzes. */
  readonly sort?: 'title' | 'created' | 'updated'
  /** The sort direction. */
  readonly order?: 'asc' | 'desc'
  /** The maximum number of quizzes to return per page. */
  readonly limit?: number
  /** The current pagination offset. */
  readonly offset?: number
}

/**
 * Props for the `ProfileQuizzesPageUI` component.
 */
export interface ProfileQuizzesPageUIProps {
  /** The quizzes to display in the grid. */
  readonly quizzes: readonly QuizResponseDto[]
  /** The currently applied search and filter values. */
  readonly filter: ProfileQuizzesPageUISearchParams
  /** Indicates whether the initial page data is loading. */
  readonly isLoading: boolean
  /** Indicates whether an additional page is currently loading. */
  readonly isLoadingMore: boolean
  /** Indicates whether loading the quizzes failed. */
  readonly isError: boolean
  /** Indicates whether more quizzes are available to load. */
  readonly hasMore: boolean
  /** The number of skeleton cards to render while loading. */
  readonly skeletonCount: number
  /** Loads the next page of quizzes. */
  readonly onLoadMore: () => void
  /** Updates the current search and filter parameters. */
  readonly onChangeSearchParams: (
    params: ProfileQuizzesPageUISearchParams,
  ) => void
  /** Navigates to the quiz creation flow. */
  readonly onCreateQuiz: () => void
}

/**
 * Renders the profile quizzes page UI including filters, loading, error, empty, and paginated quiz states.
 */
const ProfileQuizzesPageUI: FC<ProfileQuizzesPageUIProps> = ({
  quizzes,
  filter,
  isLoading,
  isLoadingMore,
  isError,
  hasMore,
  skeletonCount,
  onLoadMore,
  onChangeSearchParams,
  onCreateQuiz,
}) => {
  const hasSearchFilter = !!(
    filter.search?.length ||
    filter.visibility ||
    filter.category ||
    filter.languageCode ||
    filter.mode
  )

  return (
    <Page align="start" discover profile>
      <Typography variant="title">Your Quiz Shelf</Typography>
      <Typography variant="body" width="medium">
        All your quiz creations, lined up and ready for their next moment in the
        spotlight.
      </Typography>
      <Button
        id="create-quiz-button"
        type="button"
        kind="call-to-action"
        size="small"
        value="Create Quiz"
        icon={faPlus}
        iconPosition="leading"
        onClick={onCreateQuiz}
      />
      {(!!quizzes.length || hasSearchFilter) && (
        <QuizTableFilter
          filter={filter}
          onChange={onChangeSearchParams}
          showVisibilityFilter
        />
      )}
      {isError || (!isLoading && quizzes.length === 0) ? (
        <p className={styles.emptyState} data-testid="profile-empty-state">
          {isError
            ? 'Oops! Your quizzes are playing hide-and-seek right now. Please try again.'
            : hasSearchFilter
              ? 'No quiz cards matched that combo. Try mixing up your filters.'
              : 'Your quiz shelf is empty. Time to create your first one!'}
        </p>
      ) : (
        <>
          <div className={styles.grid} data-testid="profile-quiz-grid">
            {isLoading && quizzes.length === 0
              ? Array.from({ length: skeletonCount }).map((_, i) => (
                  <ProfileQuizCardSkeleton key={i} />
                ))
              : quizzes.map((quiz) => (
                  <ProfileQuizCard key={quiz.id} quiz={quiz} />
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

export default ProfileQuizzesPageUI
