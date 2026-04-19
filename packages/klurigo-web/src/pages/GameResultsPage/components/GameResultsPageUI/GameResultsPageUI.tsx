import { type GameResultDto } from '@klurigo/common'
import { type FC } from 'react'
import { useState } from 'react'

import { useKlurigoServiceClient } from '../../../../api'
import { Page, SegmentedControl, Typography } from '../../../../components'
import { useQuizRatingDraft } from '../../../../hooks'

import styles from './GameResultsPageUI.module.scss'
import { PlayerSection, QuestionSection, SummarySection } from './sections'

export type GameResultsPageUIProps = {
  results: GameResultDto
  currentParticipantId: string
}

/**
 * Runtime map of sections displayed in the game results view.
 *
 * These values are used at runtime to control which result section
 * is rendered or selected.
 */
const GameResultSection = {
  Summary: 'SUMMARY',
  Players: 'PLAYERS',
  Questions: 'QUESTIONS',
} as const

/**
 * Identifies a logical section within the game results view.
 *
 * Possible values:
 * - `Summary` – Overall game summary and aggregated results
 * - `Players` – Per-player results and rankings
 * - `Questions` – Per-question statistics and breakdowns
 */
export type GameResultSection =
  (typeof GameResultSection)[keyof typeof GameResultSection]

const GameResultSectionLabels: { [key in GameResultSection]: string } = {
  [GameResultSection.Summary]: 'Summary',
  [GameResultSection.Players]: 'Players',
  [GameResultSection.Questions]: 'Questions',
}

const GameResultsPageUI: FC<GameResultsPageUIProps> = ({
  results,
  currentParticipantId,
}) => {
  const [selectedSection, setSelectedSection] = useState<GameResultSection>(
    GameResultSection.Summary,
  )

  const { createOrUpdateQuizRating } = useKlurigoServiceClient()

  const { stars, commentDraft, setStars, setCommentDraft } = useQuizRatingDraft(
    {
      quizId: results.quiz.id,
      canRateQuiz: results.quiz.canRateQuiz,
      initialStars: results.rating?.stars,
      initialComment: results.rating?.comment,
      persist: (stars, comment) =>
        createOrUpdateQuizRating(results.quiz.id, stars, comment),
      debounceMs: 600,
    },
  )

  return (
    <Page align="start" height="normal" discover profile>
      <div className={styles.gameResultsPage}>
        <Typography variant="title" align="center" color="inverse">
          {results.name}
        </Typography>

        <Typography variant="body" align="center" color="inverse">
          A quick look at how this game unfolded — see how players performed,
          how fast they answered, and who stood out.
        </Typography>

        <SegmentedControl
          id="section-segmented-control"
          value={selectedSection}
          values={Object.values(GameResultSection).map((section) => ({
            key: section,
            value: section,
            valueLabel: GameResultSectionLabels[section],
          }))}
          onChange={(section) =>
            setSelectedSection(section as GameResultSection)
          }
        />

        {selectedSection === GameResultSection.Summary && (
          <SummarySection
            mode={results.mode}
            quiz={results.quiz}
            host={results.host}
            numberOfPlayers={results.numberOfPlayers}
            numberOfQuestions={results.numberOfQuestions}
            playerMetrics={results.playerMetrics}
            questionMetrics={results.questionMetrics}
            duration={results.duration}
            created={results.created}
            stars={stars}
            comment={commentDraft}
            onRatingChange={setStars}
            onCommentChange={setCommentDraft}
          />
        )}

        {selectedSection === GameResultSection.Players && (
          <PlayerSection
            mode={results.mode}
            playerMetrics={results.playerMetrics}
            currentParticipantId={currentParticipantId}
          />
        )}

        {selectedSection === GameResultSection.Questions && (
          <QuestionSection
            mode={results.mode}
            questionMetrics={results.questionMetrics}
          />
        )}
      </div>
    </Page>
  )
}

export default GameResultsPageUI
