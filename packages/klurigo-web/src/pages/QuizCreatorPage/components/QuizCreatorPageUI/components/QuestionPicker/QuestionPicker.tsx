import type { DragEndEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { QuestionType } from '@klurigo/common'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button, ConfirmDialog } from '../../../../../../components'
import { DeviceType } from '../../../../../../utils/device-size.types'
import { useDeviceSizeType } from '../../../../../../utils/useDeviceSizeType'

import { QuestionPickerItem } from './components'
import styles from './QuestionPicker.module.scss'

export type QuestionPickerItem = {
  id: string
  type: QuestionType
  text?: string
  valid: boolean
}

export interface QuestionPickerProps {
  questions: QuestionPickerItem[]
  selectedQuestionIndex: number
  onAddQuestion: () => void
  onSelectQuestion: (index: number) => void
  onMoveQuestion: (fromIndex: number, toIndex: number) => void
  onDuplicateQuestion: (index: number) => void
  onDeleteQuestion: (index: number) => void
}

const QuestionPicker: FC<QuestionPickerProps> = ({
  questions,
  selectedQuestionIndex,
  onAddQuestion,
  onSelectQuestion,
  onMoveQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
}) => {
  const questionPickerItemContainerRef = useRef<HTMLDivElement>(null)
  const [deleteQuestionIndex, setDeleteQuestionIndex] = useState<number>()

  const deviceType = useDeviceSizeType()
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return

    const fromIndex = questions.findIndex(({ id }) => id === active.id)
    const toIndex = questions.findIndex(({ id }) => id === over.id)
    if (fromIndex >= 0 && toIndex >= 0) onMoveQuestion(fromIndex, toIndex)
  }

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
    const selectedItem = container?.children.item(selectedItemIndex)

    if (selectedItem instanceof HTMLElement) {
      selectedItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })
    }
  }, [questions.length, selectedItemIndex])

  const handleDeleteQuestion = () => {
    if (
      deleteQuestionIndex === undefined ||
      deleteQuestionIndex < 0 ||
      deleteQuestionIndex >= questions.length ||
      questions.length <= 1
    ) {
      return
    }

    onDeleteQuestion(deleteQuestionIndex)
    setDeleteQuestionIndex(undefined)
  }

  return (
    <div className={styles.questionPickerWrapper}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}>
        <SortableContext
          items={questions.map(({ id }) => id)}
          strategy={
            deviceType === DeviceType.Desktop
              ? verticalListSortingStrategy
              : horizontalListSortingStrategy
          }>
          <div
            ref={questionPickerItemContainerRef}
            className={styles.questionPickerItemContainer}>
            {questions.map(({ id, type, text, valid }, index) => (
              <QuestionPickerItem
                key={id}
                id={id}
                index={index}
                text={text || 'Question'}
                type={type}
                active={isActive(index)}
                valid={valid}
                canDelete={questions.length > 1}
                onClick={() => onSelectQuestion(index)}
                onDuplicate={() => onDuplicateQuestion(index)}
                onDelete={() => setDeleteQuestionIndex(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className={styles.addQuestionButtonWrapper}>
        <Button
          id="add-question-button"
          type="button"
          variant="primary"
          surface="light"
          icon={faPlus}
          value="Add question"
          onClick={onAddQuestion}
          grow
        />
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
