import { type GameOverPlayerEvent } from '@klurigo/common'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'

import ScoreChip, {
  Badge,
  Confetti,
  getBadgePositionBackgroundColor,
  getCelebrationLevel,
  IconButtonArrowLeft,
  IconButtonArrowRight,
  StreakBadge,
  Typography,
} from '../../components'
import { getBadgePositionTextColor } from '../../components/Badge/badge-utils'
import { useAuthContext } from '../../context/auth'
import { useGameContext } from '../../context/game'
import { useQuizRatingDraft } from '../../hooks'
import { GamePage, PointsBehindIndicator } from '../common'

import { RatingCard } from './components'
import styles from './PlayerGameOverState.module.scss'

export type PlayerGameOverStateProps = {
  event: GameOverPlayerEvent
}

/**
 * Renders the player game-over screen after the game reaches the podium stage.
 *
 * Displays the player's final rank, score, streak, comeback info, behind info,
 * quiz title, a rating card, and action buttons for navigating away from the game.
 */
const PlayerGameOverState: FC<PlayerGameOverStateProps> = ({
  event: {
    game,
    quiz,
    player: {
      rank,
      totalPlayers,
      score,
      currentStreak,
      comebackRankGain,
      behind,
    },
    rating: { canRateQuiz, stars: initialStars, comment: initialComment },
  },
}) => {
  const { isUserAuthenticated, revokeGame } = useAuthContext()
  const { createOrUpdateGameRating } = useGameContext()

  const { stars, commentDraft, setStars, setCommentDraft } = useQuizRatingDraft(
    {
      quizId: quiz.id,
      canRateQuiz,
      initialStars,
      initialComment,
      persist: (nextStars, nextComment) =>
        createOrUpdateGameRating?.({
          stars: nextStars,
          comment: nextComment,
        }) ?? Promise.reject(),
    },
  )

  const celebrationLevel = useMemo(
    () => getCelebrationLevel(rank, currentStreak),
    [rank, currentStreak],
  )

  const handleBackToHome = useCallback(() => {
    void revokeGame({ redirectTo: '/' })
  }, [revokeGame])

  const handleViewFullResults = useCallback(() => {
    void revokeGame({ redirectTo: `/game/results/${game.id}` })
  }, [revokeGame, game.id])

  return (
    <GamePage
      width="medium"
      align="center"
      header={
        <IconButtonArrowLeft
          id="home-button"
          type="button"
          kind="call-to-action"
          size="small"
          loading={false}
          onClick={handleBackToHome}>
          Back to Home
        </IconButtonArrowLeft>
      }>
      {celebrationLevel !== 'none' && (
        <Confetti trigger={true} intensity={celebrationLevel} />
      )}

      <Typography variant="title">{quiz.title}</Typography>

      <div className={styles.rankContainer}>
        <Badge
          size="large"
          backgroundColor={getBadgePositionBackgroundColor(rank)}
          textColor={getBadgePositionTextColor(rank)}
          celebration={celebrationLevel}>
          {rank}
        </Badge>
        <Typography variant="text" size="small">
          out of {totalPlayers} players
        </Typography>
      </div>

      <ScoreChip value={score} />

      <StreakBadge streak={currentStreak}>Streak</StreakBadge>

      {comebackRankGain > 0 && (
        <Typography variant="text" size="small">
          ↗ Comeback! +{comebackRankGain} ranks
        </Typography>
      )}

      {behind && <PointsBehindIndicator {...behind} />}

      {canRateQuiz && (
        <RatingCard
          stars={stars}
          comment={commentDraft}
          onRatingChange={setStars}
          onCommentChange={setCommentDraft}
        />
      )}

      {isUserAuthenticated && (
        <IconButtonArrowRight
          id="game-results-button"
          type="button"
          onClick={handleViewFullResults}>
          View Full Results
        </IconButtonArrowRight>
      )}
    </GamePage>
  )
}

export default PlayerGameOverState
