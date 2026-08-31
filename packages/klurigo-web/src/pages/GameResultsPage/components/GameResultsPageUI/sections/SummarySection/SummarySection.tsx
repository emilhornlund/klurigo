import type { IconDefinition } from '@fortawesome/fontawesome-common-types'
import {
  faCalendar,
  faCircleQuestion,
  faClock,
  faGamepad,
  faPlay,
  faUser,
  faUserTie,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  GameMode,
  type GameResultClassicModePlayerMetricDto,
  type GameResultClassicModeQuestionMetricDto,
  type GameResultDto,
  type GameResultParticipantDto,
  type GameResultQuizDto,
  type GameResultZeroToOneHundredModeQuestionMetricDto,
} from '@klurigo/common'
import { type FC, type ReactElement, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../../../../../api'
import {
  CircularProgressBar,
  CircularProgressBarKind,
  CircularProgressBarSize,
  ConfirmDialog,
  Leaderboard,
  type LeaderboardValue,
  NicknameChip,
  PageDivider,
  Podium,
  type PodiumValue,
  Typography,
} from '../../../../../../components'
import { GameModeLabels } from '../../../../../../models'
import {
  DATE_FORMATS,
  formatLocalDate,
} from '../../../../../../utils/date.utils'
import { classNames } from '../../../../../../utils/helpers'
import {
  formatRoundedDuration,
  formatRoundedSeconds,
  getAveragePrecision,
  getCorrectPercentage,
  getQuizDifficultyMessage,
} from '../../utils'

import RatingCard, { type RatingCardProps } from './RatingCard'
import {
  getComebackRankGainMetric,
  getFastestOverallPlayerMetric,
  getLongestCorrectStreakMetric,
  getMostAccuratePlayerMetric,
  getPrecisionChampionMetric,
  type Metric,
} from './summary-section.metrics'
import styles from './SummarySection.module.scss'

const DetailsItem: FC<{
  title: string
  icon: IconDefinition
  children: ReactElement | string | number
}> = ({ title, icon, children }) => (
  <div className={styles.item}>
    <FontAwesomeIcon icon={icon} className={styles.icon} />
    <Typography variant="body2" color="inverse">
      {title}
    </Typography>
    <Typography variant="body2" align="right" color="inverse" noOpacity bold>
      {children}
    </Typography>
  </div>
)

const MetricCard: FC<{ title: string; value: string; nicknames: string[] }> = ({
  title,
  value,
  nicknames,
}) => (
  <div className={classNames(styles.card, styles.metric)}>
    <Typography variant="body2" align="center" color="inverse">
      {title}
    </Typography>
    <Typography variant="title3" align="center" color="inverse" noOpacity>
      {value}
    </Typography>
    <div className={styles.nicknames}>
      {nicknames.map((nickname, index) => (
        <NicknameChip key={`${nickname}_${index}`} value={nickname} />
      ))}
    </div>
  </div>
)

export type SummarySectionProps = {
  mode: GameMode
  quiz: GameResultQuizDto
  host: GameResultParticipantDto
  numberOfPlayers: number
  numberOfQuestions: number
  playerMetrics: GameResultDto['playerMetrics']
  questionMetrics: GameResultDto['questionMetrics']
  duration: number
  created: Date
} & Omit<RatingCardProps, 'canRateQuiz'>

const SummarySection: FC<SummarySectionProps> = ({
  mode,
  quiz,
  host,
  numberOfPlayers,
  numberOfQuestions,
  playerMetrics,
  questionMetrics,
  duration,
  created,
  stars,
  comment,
  onRatingChange,
  onCommentChange,
}) => {
  const navigate = useNavigate()

  const { createGame, authenticateGame } = useKlurigoServiceClient()

  const [showConfirmHostGameModal, setShowConfirmHostGameModal] =
    useState<boolean>(false)
  const [isHostGameLoading, setIsHostGameLoading] = useState<boolean>(false)

  const percentage = useMemo<number>(
    () =>
      Math.ceil(
        questionMetrics.reduce((prev, metric) => {
          if (mode === GameMode.Classic) {
            return (
              prev +
              getCorrectPercentage(
                metric as GameResultClassicModeQuestionMetricDto,
              )
            )
          }
          if (mode === GameMode.ZeroToOneHundred) {
            return (
              prev +
              getAveragePrecision(
                metric as GameResultZeroToOneHundredModeQuestionMetricDto,
              )
            )
          }
          return prev
        }, 0) / questionMetrics.length,
      ),
    [mode, questionMetrics],
  )

  const averageResponseTimeMetric = useMemo<Metric | null>(
    () => getFastestOverallPlayerMetric(playerMetrics),
    [playerMetrics],
  )

  const longestCorrectStreakMetric = useMemo<Metric | null>(
    () =>
      mode === GameMode.Classic
        ? getLongestCorrectStreakMetric(
            playerMetrics as GameResultClassicModePlayerMetricDto[],
          )
        : null,
    [mode, playerMetrics],
  )

  const mostAccuratePlayer = useMemo<Metric | null>(
    () =>
      getMostAccuratePlayerMetric({
        mode,
        playerMetrics,
        numberOfQuestions,
      }),
    [mode, playerMetrics, numberOfQuestions],
  )

  const precisionChampion = useMemo<Metric | null>(
    () => getPrecisionChampionMetric({ mode, playerMetrics }),
    [mode, playerMetrics],
  )

  const comebackRankGain = useMemo<Metric | null>(
    () => getComebackRankGainMetric(playerMetrics),
    [playerMetrics],
  )

  const podiumValues = useMemo<PodiumValue[]>(() => {
    return playerMetrics
      .sort((lhs, rhs) => lhs.rank - rhs.rank)
      .slice(0, 3)
      .map(({ rank, player, score }) => ({
        position: rank,
        nickname: player?.nickname ?? '',
        score,
      }))
  }, [playerMetrics])

  const leaderboardValues = useMemo<LeaderboardValue[]>(
    () =>
      playerMetrics
        .sort((lhs, rhs) => lhs.rank - rhs.rank)
        .map(({ rank, player, score }) => ({
          position: rank,
          nickname: player?.nickname ?? '',
          score,
        })),
    [playerMetrics],
  )

  const handleCreateGame = (): void => {
    if (quiz.canHostLiveGame) {
      setIsHostGameLoading(true)
      createGame(quiz.id)
        .then(({ id: gameId }) =>
          authenticateGame({ gameId }).then(() => navigate('/game')),
        )
        .catch(() => undefined)
        .finally(() => setIsHostGameLoading(false))
    }
  }

  return (
    <section>
      <div className={styles.cards}>
        <div className={styles.podiumWrapper}>
          <Podium values={podiumValues} />
          <Leaderboard values={leaderboardValues} includePodium={false} />
          <PageDivider />
        </div>

        <div className={classNames(styles.card, styles.full, styles.progress)}>
          <CircularProgressBar
            kind={CircularProgressBarKind.Correct}
            size={CircularProgressBarSize.Medium}
            progress={percentage}
            percentageColor="white"
          />
          <Typography variant="body2" color="inverse" className={styles.text}>
            {getQuizDifficultyMessage(percentage)}
          </Typography>
        </div>

        <RatingCard
          canRateQuiz={quiz.canRateQuiz}
          stars={stars}
          comment={comment}
          onRatingChange={onRatingChange}
          onCommentChange={onCommentChange}
        />

        <button
          id="host-game-button"
          type="button"
          className={classNames(styles.card, styles.hostGameButton)}
          disabled={!quiz.canHostLiveGame}
          onClick={() => setShowConfirmHostGameModal(true)}>
          {quiz.canHostLiveGame ? (
            <>
              <div className={styles.content}>
                <Typography variant="title3" align="center" color="inverse">
                  Play again
                </Typography>
                <Typography variant="body2" align="center" color="inverse">
                  Start a new live game with this quiz and invite others to
                  join.
                </Typography>
              </div>
              <div className={styles.icon}>
                <FontAwesomeIcon icon={faPlay} />
              </div>
            </>
          ) : (
            <>
              <div className={styles.content}>
                <Typography variant="title3" align="center" color="inverse">
                  Play again
                </Typography>
                <Typography variant="body2" align="center" color="inverse">
                  This quiz isn’t public yet. Ask the owner to make it public
                  before hosting a live game.
                </Typography>
              </div>
            </>
          )}
        </button>

        <div className={classNames(styles.card, styles.full, styles.details)}>
          <div className={styles.column}>
            <DetailsItem title="Game Mode" icon={faGamepad}>
              {GameModeLabels[mode]}
            </DetailsItem>

            <DetailsItem title="Players" icon={faUser}>
              {numberOfPlayers}
            </DetailsItem>

            <DetailsItem title="Questions" icon={faCircleQuestion}>
              {numberOfQuestions}
            </DetailsItem>
          </div>

          <div className={styles.separator} />

          <div className={styles.column}>
            <DetailsItem title="Host" icon={faUserTie}>
              {host.nickname ? (
                <Link to={`/users/${host.id}/profile`}>{host.nickname}</Link>
              ) : (
                'N/A'
              )}
            </DetailsItem>

            <DetailsItem title="Date" icon={faCalendar}>
              {formatLocalDate(created, DATE_FORMATS.DATE_TIME)}
            </DetailsItem>

            <DetailsItem title="Duration" icon={faClock}>
              {formatRoundedDuration(duration)}
            </DetailsItem>
          </div>
        </div>

        {averageResponseTimeMetric && (
          <MetricCard
            title="Fastest Overall Player"
            value={formatRoundedSeconds(averageResponseTimeMetric.value)}
            nicknames={averageResponseTimeMetric.players.map(
              ({ nickname }) => nickname,
            )}
          />
        )}

        {mode === GameMode.Classic && longestCorrectStreakMetric && (
          <MetricCard
            title="Longest Correct Streak"
            value={`${longestCorrectStreakMetric.value}`}
            nicknames={longestCorrectStreakMetric.players.map(
              ({ nickname }) => nickname,
            )}
          />
        )}

        {mostAccuratePlayer && (
          <MetricCard
            title="Most Accurate Player"
            value={`${mostAccuratePlayer.value}%`}
            nicknames={mostAccuratePlayer.players.map(
              ({ nickname }) => nickname,
            )}
          />
        )}

        {precisionChampion && (
          <MetricCard
            title="Precision Champion"
            value={`${precisionChampion.value}%`}
            nicknames={precisionChampion.players.map(
              ({ nickname }) => nickname,
            )}
          />
        )}

        {comebackRankGain && (
          <MetricCard
            title="Biggest Comeback"
            value={`${comebackRankGain.value}`}
            nicknames={comebackRankGain.players.map(({ nickname }) => nickname)}
          />
        )}
      </div>

      <ConfirmDialog
        title="Host Game"
        message="Are you sure you want to start hosting a new game? Players will be able to join as soon as the game starts."
        open={showConfirmHostGameModal}
        loading={isHostGameLoading}
        onConfirm={handleCreateGame}
        onClose={() => setShowConfirmHostGameModal(false)}
      />
    </section>
  )
}

export default SummarySection
