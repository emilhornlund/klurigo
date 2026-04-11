import {
  faArrowRotateLeft,
  faMagnifyingGlass,
  faPlus,
} from '@fortawesome/free-solid-svg-icons'
import type { GameHistoryDto } from '@klurigo/common'
import { GameStatus } from '@klurigo/common'
import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button, Page, PageDivider, Typography } from '../../../../components'

import { ProfileGameCard, ProfileGameCardSkeleton } from './components'
import styles from './ProfileGamesPageUI.module.scss'

/**
 * Props for the `ProfileGamesPageUI` component.
 */
export interface ProfileGamesPageUIProps {
  /** The games to display in the grid. */
  readonly games: readonly GameHistoryDto[]
  /** Indicates whether the initial page data is loading. */
  readonly isLoading: boolean
  /** Indicates whether an additional page is currently loading. */
  readonly isLoadingMore: boolean
  /** Indicates whether loading the games failed. */
  readonly isError: boolean
  /** Indicates whether more games are available to load. */
  readonly hasMore: boolean
  /** The number of skeleton cards to render while loading. */
  readonly skeletonCount: number
  /** Loads the next page of games. */
  readonly onLoadMore: () => void
  /** Handles navigation when a game card is clicked. */
  readonly onClick: (id: string, status: GameStatus) => void
}

/**
 * Renders the profile games page UI including loading, error, empty, and paginated game states.
 */
const ProfileGamesPageUI: FC<ProfileGamesPageUIProps> = ({
  games,
  isLoading,
  isLoadingMore,
  isError,
  hasMore,
  skeletonCount,
  onLoadMore,
  onClick,
}) => {
  const navigate = useNavigate()

  if (!isLoading && !isError && games.length === 0) {
    return (
      <Page align="start" width="medium" discover profile>
        <Typography variant="title">No Games Yet</Typography>
        <Typography variant="body">
          Host live quizzes and play together with others. Your games will
          appear here once you start.
        </Typography>

        <PageDivider />

        <Typography variant="title2" width="medium">
          Looking for something to play?
        </Typography>
        <Typography variant="body" width="medium">
          Browse quizzes made by others and host a live game in seconds.
        </Typography>
        <Button
          id="discover-quizzes-button"
          type="button"
          kind="primary"
          size="small"
          value="Discover quizzes"
          icon={faMagnifyingGlass}
          iconPosition="leading"
          onClick={() => navigate('/discover')}
        />

        <PageDivider />

        <Typography variant="title2" width="medium">
          Want to make your own?
        </Typography>
        <Typography variant="body" width="medium">
          Create a quiz in minutes and reuse it for future games.
        </Typography>
        <Button
          id="create-quiz-button"
          type="button"
          kind="call-to-action"
          size="small"
          value="Create a quiz"
          icon={faPlus}
          iconPosition="leading"
          onClick={() => navigate('/quiz/create')}
        />
      </Page>
    )
  }

  return (
    <Page align="start" discover profile>
      <Typography variant="title">Game History</Typography>
      <Typography variant="body" width="medium">
        Review your past games and track your performance.
      </Typography>
      {isError ? (
        <p
          className={styles.emptyState}
          data-testid="profile-games-empty-state">
          Oops! Your game history is playing hide-and-seek right now. Please try
          again.
        </p>
      ) : (
        <>
          <div className={styles.grid} data-testid="profile-game-grid">
            {isLoading && games.length === 0
              ? Array.from({ length: skeletonCount }).map((_, i) => (
                  <ProfileGameCardSkeleton key={i} />
                ))
              : games.map((game) => (
                  <ProfileGameCard
                    key={game.id}
                    game={game}
                    onClick={onClick}
                  />
                ))}
          </div>
          {hasMore && (
            <div className={styles.loadMoreContainer}>
              <Button
                id="load-more-games-button"
                type="button"
                icon={faArrowRotateLeft}
                loading={isLoadingMore}
                onClick={onLoadMore}
                data-testid="load-more-games-button">
                Load more games
              </Button>
            </div>
          )}
        </>
      )}
    </Page>
  )
}

export default ProfileGamesPageUI
