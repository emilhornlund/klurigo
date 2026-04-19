import {
  faCircleCheck,
  faCircleXmark,
  faUserGroup,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type {
  GameEventQuestionResults,
  GameEventQuestionResultsMultiChoice,
  QuestionCorrectAnswerDto,
} from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import type { FC } from 'react'
import { useMemo } from 'react'

import { Typography } from '../../../../components'
import { classNames } from '../../../../utils/helpers'

import styles from './QuestionResults.module.scss'

interface ResultChipProps {
  value: string
  count: number
  correct: boolean
  loading?: boolean
  onClick?: () => void
  index?: number
}

const ResultChip: FC<ResultChipProps> = ({
  value,
  count,
  correct,
  loading,
  onClick,
  index,
}) => (
  <div
    className={classNames(
      styles.chip,
      correct ? styles.correct : styles.incorrect,
    )}
    style={
      index !== undefined
        ? ({ '--index': index } as React.CSSProperties & { '--index': number })
        : undefined
    }>
    {value}
    <span>
      <Typography variant="body2" color="inverse" noWrap bold>
        <FontAwesomeIcon icon={faUserGroup} /> {count}
      </Typography>
    </span>
    {onClick && (
      <button
        className={classNames(
          styles.buttonOverlay,
          loading ? styles.loading : undefined,
        )}
        disabled={loading}
        onClick={onClick}>
        {!loading && !correct && (
          <FontAwesomeIcon icon={faCircleCheck} className={styles.icon} />
        )}
        {!loading && correct && (
          <FontAwesomeIcon icon={faCircleXmark} className={styles.icon} />
        )}
        {loading && (
          <div className={styles.loadingSpinner}>
            <div></div>
            <div></div>
            <div></div>
          </div>
        )}
      </button>
    )}
  </div>
)

export interface QuestionResultsProps {
  results: GameEventQuestionResults
  loading: boolean
  onAddCorrectAnswer: (answer: QuestionCorrectAnswerDto) => void
  onDeleteCorrectAnswer: (answer: QuestionCorrectAnswerDto) => void
}

const getResultChips = (
  results: GameEventQuestionResults,
  correct: boolean,
  loading: boolean,
  processCorrectAnswer: (answer: QuestionCorrectAnswerDto) => void,
  startingIndex: number = 0,
) =>
  results.distribution
    .filter((item) => item.correct === correct)
    .sort((lhs, rhs) => rhs.count - lhs.count)
    .map((distribution, index) => {
      const globalIndex = index + startingIndex
      const { value, count, correct } = distribution
      switch (results.type) {
        case QuestionType.MultiChoice: {
          const optionIndex = (
            distribution as GameEventQuestionResultsMultiChoice['distribution'][0]
          ).index
          return (
            <ResultChip
              key={`${index}_${value}`}
              value={value as string}
              count={count}
              correct={correct}
              loading={loading}
              index={globalIndex}
              onClick={() =>
                processCorrectAnswer({
                  type: QuestionType.MultiChoice,
                  index: optionIndex,
                })
              }
            />
          )
        }
        case QuestionType.TrueFalse:
          return (
            <ResultChip
              key={`${index}_${value}`}
              value={(value as boolean) ? 'True' : 'False'}
              count={count}
              correct={correct}
              loading={loading}
              index={globalIndex}
            />
          )
        case QuestionType.Range:
          return (
            <ResultChip
              key={`${index}_${value}`}
              value={`${value as number}`}
              count={count}
              correct={correct}
              loading={loading}
              index={globalIndex}
            />
          )
        case QuestionType.TypeAnswer:
          return (
            <ResultChip
              key={`${index}_${value}`}
              value={value as string}
              count={count}
              correct={correct}
              loading={loading}
              index={globalIndex}
              onClick={() =>
                processCorrectAnswer({
                  type: QuestionType.TypeAnswer,
                  value: value as string,
                })
              }
            />
          )
      }
    })

const QuestionResults: FC<QuestionResultsProps> = ({
  results,
  loading,
  onAddCorrectAnswer,
  onDeleteCorrectAnswer,
}) => {
  const correctElements = useMemo(
    () => getResultChips(results, true, loading, onDeleteCorrectAnswer, 0),
    [results, loading, onDeleteCorrectAnswer],
  )
  const incorrectElements = useMemo(
    () =>
      getResultChips(
        results,
        false,
        loading,
        onAddCorrectAnswer,
        correctElements.length,
      ),
    [results, loading, onAddCorrectAnswer, correctElements.length],
  )
  return (
    <div className={styles.questionResults} data-testid="question-results">
      {correctElements?.length > 0 && (
        <div className={styles.chips}>{correctElements}</div>
      )}
      {incorrectElements?.length > 0 && (
        <div className={styles.chips}>{incorrectElements}</div>
      )}
    </div>
  )
}

export default QuestionResults
