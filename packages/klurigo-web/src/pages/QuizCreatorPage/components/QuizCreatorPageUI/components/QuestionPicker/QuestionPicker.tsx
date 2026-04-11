import { faPlusCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { QuestionType } from '@klurigo/common'
import type { FC, MouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ConfirmDialog } from '../../../../../../components'

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
  onDeleteQuestion: (index: number) => void
}

const QuestionPicker: FC<QuestionPickerProps> = ({
  questions,
  selectedQuestionIndex,
  onAddQuestion,
  onSelectQuestion,
  onDropQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
}) => {
  const questionPickerItemContainerRef = useRef<HTMLDivElement>(null)

  const [deleteQuestionIndex, setDeleteQuestionIndex] = useState<number>()

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

  const handleDeleteQuestion = () => {
    if (deleteQuestionIndex) {
      onDeleteQuestion?.(deleteQuestionIndex)
      setDeleteQuestionIndex(undefined)
    }
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
            onDelete={() => setDeleteQuestionIndex(index)}
          />
        ))}
      </div>
      <div className={styles.addQuestionButtonWrapper}>
        <button
          className={styles.addQuestionButton}
          onClick={handleAddItemButtonClick}>
          <FontAwesomeIcon icon={faPlusCircle} widthAuto />
        </button>
      </div>
      <ConfirmDialog
        title="Delete quiz question"
        message="Are you sure you want to delete this question? This action can't be undone."
        open={deleteQuestionIndex !== undefined}
        confirmTitle="Delete"
        onConfirm={handleDeleteQuestion}
        onClose={() => setDeleteQuestionIndex(undefined)}
        destructive
      />
    </div>
  )
}

export default QuestionPicker
