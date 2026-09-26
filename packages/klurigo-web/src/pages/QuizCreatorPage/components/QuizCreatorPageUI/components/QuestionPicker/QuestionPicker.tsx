import { faPlusCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { QuestionType } from '@klurigo/common'
import type { FC, MouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { QuestionPickerItem } from './components'
import styles from './QuestionPicker.module.scss'

export type QuestionPickerItem = {
  type: QuestionType
  text?: string
  valid: boolean
}

export interface QuestionPickerProps {
  questions: QuestionPickerItem[]
  selectedQuestionIndex: number
  onAddQuestion: () => void
  onSelectQuestion: (index: number) => void
  onDropQuestion: (index: number) => void
  onDuplicateQuestion: (index: number) => void
}

const QuestionPicker: FC<QuestionPickerProps> = ({
  questions,
  selectedQuestionIndex,
  onAddQuestion,
  onSelectQuestion,
  onDropQuestion,
  onDuplicateQuestion,
}) => {
  const questionPickerItemContainerRef = useRef<HTMLDivElement>(null)

  const selectedItemIndex = useMemo(
    () => Math.min(selectedQuestionIndex, questions.length - 1),
    [selectedQuestionIndex, questions],
  )

  const isActive = useCallback(
    (index: number) => selectedItemIndex === index,
    [selectedItemIndex],
  )

  useEffect(() => {
    const container = questionPickerItemContainerRef.current
    if (container && selectedItemIndex === questions.length - 1) {
      container.scrollTo({
        left: container.scrollWidth,
        behavior: 'smooth',
      })
    }
  }, [questions, selectedItemIndex])

  const handleAddItemButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    onAddQuestion()
  }

  return (
    <div className={styles.questionPickerWrapper}>
      <div
        ref={questionPickerItemContainerRef}
        className={styles.questionPickerItemContainer}>
        {questions.map(({ type, text, valid }, index) => (
          <QuestionPickerItem
            key={`question-picker-item-${index}`}
            index={index}
            text={text || 'Question'}
            type={type}
            active={isActive(index)}
            valid={valid}
            onClick={() => onSelectQuestion(index)}
            onDrop={onDropQuestion}
            onDuplicate={() => onDuplicateQuestion(index)}
          />
        ))}
      </div>
      <div className={styles.addQuestionButtonWrapper}>
        <button
          type="button"
          aria-label="Add question"
          className={styles.addQuestionButton}
          onClick={handleAddItemButtonClick}>
          <FontAwesomeIcon icon={faPlusCircle} widthAuto />
        </button>
      </div>
    </div>
  )
}

export default QuestionPicker
