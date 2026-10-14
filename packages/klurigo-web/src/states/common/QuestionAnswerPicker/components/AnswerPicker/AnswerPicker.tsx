import type { GameQuestionPlayerAnswerEvent } from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'

import { classNames } from '../../../../../utils/helpers'

import styles from './AnswerPicker.module.scss'

export interface AnswerPickerProps {
  answers: string[]
  submittedAnswer?: GameQuestionPlayerAnswerEvent
  interactive: boolean
  loading: boolean
  onClick: (optionIndex: number) => void
}

const AnswerPicker: FC<AnswerPickerProps> = ({
  answers,
  submittedAnswer,
  interactive,
  loading,
  onClick,
}) => {
  const selectedOptionIndex = useMemo<number | null>(() => {
    if (submittedAnswer?.type === QuestionType.MultiChoice) {
      return submittedAnswer.value
    }
    if (submittedAnswer?.type === QuestionType.TrueFalse) {
      return submittedAnswer.value ? 0 : 1 //True is index 0, False is index 1
    }
    return null
  }, [submittedAnswer])

  const disabled = useMemo(
    () => !interactive || loading || !!submittedAnswer,
    [interactive, loading, submittedAnswer],
  )

  const selectedClassName = useCallback(
    (optionIndex: number) => {
      if (!submittedAnswer) {
        return null
      }
      if (selectedOptionIndex === optionIndex) {
        return styles.selection
      }
      return styles.unselected
    },
    [submittedAnswer, selectedOptionIndex],
  )

  const handleClick = (optionIndex: number) => {
    if (!interactive) return
    onClick(optionIndex)
  }

  return (
    <div
      className={classNames(
        styles.answerPicker,
        answers.length > 4
          ? interactive
            ? styles.manyAnswers
            : styles.compactManyAnswers
          : undefined,
      )}>
      <div className={styles.grid}>
        {answers.map((value, optionIndex) => (
          <button
            key={`${optionIndex}_${value}`}
            id={`${optionIndex}_${value}`}
            type="button"
            className={classNames(
              styles.answerButton,
              selectedClassName(optionIndex),
            )}
            disabled={disabled}
            style={{ '--index': optionIndex } as React.CSSProperties}
            onClick={() => handleClick(optionIndex)}>
            <div />
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}

export default AnswerPicker
