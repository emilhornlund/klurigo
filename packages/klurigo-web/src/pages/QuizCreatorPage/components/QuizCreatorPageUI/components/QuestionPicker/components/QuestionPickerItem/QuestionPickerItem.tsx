import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { faCopy } from '@fortawesome/free-regular-svg-icons'
import {
  faCircleExclamation,
  faGripVertical,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { QuestionType } from '@klurigo/common'
import type { FC, MouseEvent } from 'react'

import { QuestionTypeLabels } from '../../../../../../../../models'
import { classNames } from '../../../../../../../../utils/helpers'

import styles from './QuestionPickerItem.module.scss'

export interface QuestionPickerItemProps {
  id: string
  index: number
  text: string
  type: QuestionType
  active?: boolean
  valid: boolean
  canDelete: boolean
  onClick?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

const QuestionPickerItem: FC<QuestionPickerItemProps> = ({
  id,
  index,
  text,
  type,
  active,
  valid,
  canDelete,
  onClick,
  onDuplicate,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }

  const handleClickQuestionPickerItem = (event: MouseEvent) => {
    event.preventDefault()
    onClick?.()
  }

  const handleClickDuplicate = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onDuplicate?.()
  }

  const handleClickDelete = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onDelete?.()
  }

  return (
    <div
      ref={setNodeRef}
      className={classNames(
        styles.questionPickerItem,
        active ? styles.active : undefined,
      )}
      style={style}>
      <button
        type="button"
        className={styles.questionButton}
        aria-current={active ? 'step' : undefined}
        onClick={handleClickQuestionPickerItem}>
        <span className={styles.questionNumber}>{index + 1}</span>

        <span className={styles.questionDetails}>
          <span className={styles.questionText}>{text}</span>

          <span className={styles.questionTypeRow}>
            <span className={styles.questionType}>
              {QuestionTypeLabels[type]}
            </span>

            {!valid && (
              <span
                className={styles.validationError}
                role="img"
                aria-label={`Question ${index + 1} has validation errors`}>
                <FontAwesomeIcon icon={faCircleExclamation} />
              </span>
            )}
          </span>
        </span>

        <span
          ref={setActivatorNodeRef}
          className={styles.dragHandle}
          aria-label={`Reorder question ${index + 1}`}
          onClick={(event) => event.stopPropagation()}
          {...attributes}
          {...listeners}>
          <FontAwesomeIcon icon={faGripVertical} />
        </span>
      </button>

      {active && (
        <div className={styles.questionActions}>
          <button
            type="button"
            aria-label="Duplicate question"
            className={styles.duplicateButton}
            onClick={handleClickDuplicate}>
            <FontAwesomeIcon icon={faCopy} />
          </button>

          <button
            type="button"
            aria-label="Delete question"
            className={styles.deleteButton}
            disabled={!canDelete}
            onClick={handleClickDelete}>
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      )}
    </div>
  )
}

export default QuestionPickerItem
