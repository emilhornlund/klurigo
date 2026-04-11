import { faCopy } from '@fortawesome/free-regular-svg-icons'
import { faCircleExclamation, faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { QuestionType } from '@klurigo/common'
import type { DragEvent, FC, MouseEvent } from 'react'

import { QuestionTypeLabels } from '../../../../../../../../models'
import { classNames } from '../../../../../../../../utils/helpers'

import styles from './QuestionPickerItem.module.scss'

export interface QuestionPickerItemProps {
  index: number
  text: string
  type: QuestionType
  active?: boolean
  valid: boolean
  onClick?: () => void
  onDrop?: (id: number) => void
  onDuplicate?: () => void
  onDelete?: () => void
}

const QuestionPickerItem: FC<QuestionPickerItemProps> = ({
  index,
  text,
  type,
  active,
  valid,
  onClick,
  onDrop,
  onDuplicate,
  onDelete,
}) => {
  const handleClickQuestionPickerItem = (event: MouseEvent) => {
    event.preventDefault()
    onClick?.()
  }

  const handleDragQuestionPickerItem = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDropQuestionPickerItem = (event: DragEvent<HTMLDivElement>) => {
    const result = event.currentTarget.id.match(/^question-picker-item-(\d+)$/)
    if (result?.length === 2) {
      const dropIndex = parseInt(result[1])
      onDrop?.(dropIndex)
    }
  }

  const handleClickDuplicate = (event: MouseEvent) => {
    event.preventDefault()
    onDuplicate?.()
  }

  const handleClickDelete = (event: MouseEvent) => {
    event.preventDefault()
    onDelete?.()
  }

  return (
    <div
      id={`question-picker-item-${index}`}
      draggable={active}
      className={classNames(styles.questionPickerItemWrapper)}
      onClick={handleClickQuestionPickerItem}
      onDragOver={handleDragQuestionPickerItem}
      onDrop={handleDropQuestionPickerItem}>
      <button
        className={classNames(
          styles.questionPickerItemButton,
          active ? styles.questionPickerItemActive : undefined,
        )}>
        <div className={styles.questionPickerItemText}>
          <span>{text}</span>
        </div>
        <div className={styles.questionPickerItemType}>
          {QuestionTypeLabels[type]}
        </div>
      </button>
      <div className={styles.questionPickerItemOverlay}>
        <div className={styles.questionPickerItemOverlayTop}>
          <div
            className={classNames(
              styles.questionPickerItemOverlayNumber,
              active ? styles.questionPickerItemActive : undefined,
            )}>
            {index + 1}
          </div>
        </div>
        <div className={styles.questionPickerItemOverlayBottom}>
          {active && (
            <button
              className={styles.questionPickerItemOverlayDuplicate}
              onClick={handleClickDuplicate}>
              <FontAwesomeIcon icon={faCopy} />
            </button>
          )}
          {!valid && (
            <div className={styles.questionPickerItemOverlayError}>
              <FontAwesomeIcon icon={faCircleExclamation} />
            </div>
          )}
          {active && (
            <button
              className={styles.questionPickerItemOverlayDelete}
              onClick={handleClickDelete}>
              <FontAwesomeIcon icon={faTrash} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuestionPickerItem
