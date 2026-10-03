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
  arrayMove,
  defaultAnimateLayoutChanges,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  faCheck,
  faGrip,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  type QuestionMultiChoiceOptionDto,
  QUIZ_MULTI_CHOICE_OPTIONS_MAX,
} from '@klurigo/common'
import { QUIZ_MULTI_CHOICE_OPTIONS_MIN } from '@klurigo/common'
import type { FC } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import {
  Button,
  Stack,
  TextField,
  Typography,
} from '../../../../../../../../../components'
import { classNames } from '../../../../../../../../../utils/helpers'
import type { QuizQuestionValidationResult } from '../../../../../../../utils/QuestionDataSource'
import { getValidationErrorMessage } from '../../../../../../../validation-rules'
import {
  AnswerOptionGroupError,
  AnswerOptionList,
  AnswerOptionRow,
  answerOptionStyles as styles,
} from '../shared'

const DEFAULT_MULTI_CHOICE_OPTION_COUNT = 4

export interface MultiChoiceAnswerEditorProps {
  values?: QuestionMultiChoiceOptionDto[]
  validation: QuizQuestionValidationResult
  validationRevealed?: boolean
  onChange: (value: QuestionMultiChoiceOptionDto[]) => void
}

type MultiChoiceSortableOptionValue = QuestionMultiChoiceOptionDto & {
  id: string
}

type MultiChoiceSortableOptionProps = MultiChoiceSortableOptionValue & {
  index: number
  placeholder: string
  errorMessage?: string
  showErrorMessage: boolean
  validationRevealed: boolean
  canDelete: boolean
  onChange: (value: string) => void
  onCheck: (checked: boolean) => void
  onDelete: () => void
}

const MultiChoiceSortableOption: FC<MultiChoiceSortableOptionProps> = ({
  id,
  index,
  placeholder,
  value,
  correct,
  errorMessage,
  showErrorMessage,
  validationRevealed,
  canDelete,
  onChange,
  onCheck,
  onDelete,
}) => {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({
    id,
    animateLayoutChanges: (args) =>
      args.isSorting || args.wasDragging
        ? false
        : defaultAnimateLayoutChanges(args),
  })

  const [dragDims, setDragDims] = useState<{ w: number; h: number } | null>(
    null,
  )

  const nodeEl = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isDragging && nodeEl.current) {
      const r = nodeEl.current.getBoundingClientRect()
      setDragDims((prev) =>
        r.width && r.height ? { w: r.width, h: r.height } : (prev ?? null),
      )
    }
    if (!isDragging) setDragDims(null)
  }, [isDragging])

  const setBothRefs = useCallback(
    (el: HTMLDivElement | null) => {
      nodeEl.current = el
      setNodeRef(el)
    },
    [setNodeRef],
  )

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    width: isDragging && dragDims ? `${dragDims.w}px` : undefined,
    height: isDragging && dragDims ? `${dragDims.h}px` : undefined,
  }

  return (
    <AnswerOptionRow ref={setBothRefs} style={style} dragging={isDragging}>
      <div
        className={classNames(
          styles.handle,
          isDragging ? styles.dragging : undefined,
        )}
        {...attributes}
        {...listeners}
        ref={setActivatorNodeRef}>
        <FontAwesomeIcon icon={faGrip} className={styles.icon} />
      </div>

      <div className={styles.optionIdentifier}>
        {String.fromCharCode(65 + index)}
      </div>

      <div className={styles.content}>
        <TextField
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(newValue) => onChange(newValue as string)}
          required="Enter an answer."
          customErrorMessage={errorMessage}
          showErrorMessage={showErrorMessage}
          forceValidate={validationRevealed}
        />
      </div>

      <div className={styles.correctAnswer}>
        <label
          htmlFor={`${id}-correct-checkbox`}
          className={styles.correctAnswerLabel}>
          <input
            id={`${id}-correct-checkbox`}
            type="checkbox"
            checked={correct}
            aria-label={`Mark ${placeholder} as correct`}
            onChange={(event) => onCheck(event.target.checked)}
          />

          {correct && (
            <FontAwesomeIcon
              icon={faCheck}
              className={styles.correctAnswerIcon}
            />
          )}
        </label>
      </div>

      <div className={styles.deleteAction}>
        <Button
          id={`${id}-delete-button`}
          type="button"
          size="small"
          variant="plain"
          surface="light"
          icon={faTrash}
          disabled={!canDelete}
          onClick={onDelete}
        />
      </div>
    </AnswerOptionRow>
  )
}

const MultiChoiceAnswerEditor: FC<MultiChoiceAnswerEditorProps> = ({
  values,
  validation,
  validationRevealed = false,
  onChange,
}) => {
  const prefix = useId().replace(/:/g, '')

  const [correctSelectionInteracted, setCorrectSelectionInteracted] =
    useState(false)

  const [options, setOptions] = useState<MultiChoiceSortableOptionValue[]>(() =>
    Array.from(
      {
        length: Math.max(
          values?.length ?? 0,
          DEFAULT_MULTI_CHOICE_OPTION_COUNT,
        ),
      },
      (_, index) => ({
        id: `multi-choice-option-${prefix}-${index}`,
        value: values?.[index]?.value || '',
        correct: !!values?.[index]?.correct,
      }),
    ),
  )

  useEffect(() => {
    setOptions((prev) => {
      const optionCount = Math.max(
        values?.length ?? 0,
        prev.length,
        QUIZ_MULTI_CHOICE_OPTIONS_MIN,
      )

      return Array.from({ length: optionCount }, (_, index) => ({
        id: prev[index]?.id ?? `multi-choice-option-${prefix}-${index}`,
        value: values?.[index]?.value ?? prev[index]?.value ?? '',
        correct: values?.[index]?.correct ?? prev[index]?.correct ?? false,
      }))
    })
  }, [prefix, values])

  const handleChange = useCallback(
    (updatedIndex: number, newValue?: string, newCorrect?: boolean) => {
      setOptions((prev) => {
        const next = [...prev]
        if (newValue !== undefined) {
          next[updatedIndex] = { ...next[updatedIndex], value: newValue }
        }
        if (newCorrect !== undefined) {
          next[updatedIndex] = { ...next[updatedIndex], correct: newCorrect }
        }

        onChange(
          next.map(({ value, correct }) => ({
            value,
            correct,
          })),
        )

        return next
      })
    },
    [onChange],
  )

  const handleAddOption = useCallback(() => {
    setOptions((prev) => {
      if (prev.length >= QUIZ_MULTI_CHOICE_OPTIONS_MAX) {
        return prev
      }

      const next = [
        ...prev,
        {
          id: `multi-choice-option-${prefix}-${prev.length}`,
          value: '',
          correct: false,
        },
      ]

      onChange(
        next.map(({ value, correct }) => ({
          value,
          correct,
        })),
      )

      return next
    })
  }, [onChange, prefix])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 2 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const [isDragging, setDragging] = useState(false)

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = options.findIndex((o) => o.id === active.id)
      const newIndex = options.findIndex((o) => o.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return

      setOptions((prev) => {
        const next = arrayMove(prev, oldIndex, newIndex)

        onChange(
          next.map(({ value, correct }) => ({
            value,
            correct,
          })),
        )

        return next
      })
    },
    [options, onChange],
  )

  const activeIdRef = useRef<string | null>(null)

  const optionsError = getValidationErrorMessage(validation, 'options')

  const correctAnswerError = options.some((option) => option.correct)
    ? undefined
    : 'Select at least one correct answer.'

  const showCorrectAnswerError =
    !options.some((option) => option.correct) &&
    (correctSelectionInteracted || validationRevealed)

  const collectionError =
    validationRevealed &&
    optionsError !== 'At least one option must be marked as correct.'
      ? optionsError
      : undefined

  const handleDeleteOption = useCallback(
    (index: number) => {
      setOptions((prev) => {
        if (prev.length <= QUIZ_MULTI_CHOICE_OPTIONS_MIN) {
          return prev
        }

        const next = prev.filter((_, optionIndex) => optionIndex !== index)

        onChange(
          next.map(({ value, correct }) => ({
            value,
            correct,
          })),
        )

        return next
      })
    },
    [onChange],
  )

  return (
    <Stack width="full" spacing="stack">
      <Typography variant="control2" color="muted" noOpacity>
        Add the answer choices and mark one or more as correct.
      </Typography>
      <AnswerOptionList>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => {
            setDragging(true)
            activeIdRef.current = String(active.id)
          }}
          onDragCancel={() => setDragging(false)}
          onDragEnd={(event) => {
            handleDragEnd(event)
            setDragging(false)

            if (activeIdRef.current) {
              requestAnimationFrame(() => {
                const element = document.getElementById(activeIdRef.current!)
                element?.focus?.()
              })
              activeIdRef.current = null
            }
          }}>
          <SortableContext
            items={options.map((option) => option.id)}
            strategy={verticalListSortingStrategy}>
            {options.map((option, index) => (
              <MultiChoiceSortableOption
                key={option.id}
                index={index}
                placeholder={`Option ${index + 1}`}
                errorMessage={getValidationErrorMessage(
                  validation,
                  `options[${index}].value`,
                )}
                showErrorMessage={!isDragging}
                validationRevealed={validationRevealed}
                canDelete={options.length > QUIZ_MULTI_CHOICE_OPTIONS_MIN}
                onChange={(newValue) =>
                  handleChange(index, newValue as string, undefined)
                }
                onCheck={(newChecked) => {
                  setCorrectSelectionInteracted(true)
                  handleChange(index, undefined, newChecked)
                }}
                onDelete={() => handleDeleteOption(index)}
                {...option}
              />
            ))}
          </SortableContext>
        </DndContext>

        {!isDragging && showCorrectAnswerError && (
          <AnswerOptionGroupError message={correctAnswerError!} />
        )}

        {!isDragging && collectionError && (
          <AnswerOptionGroupError message={collectionError} />
        )}
      </AnswerOptionList>

      {options.length < QUIZ_MULTI_CHOICE_OPTIONS_MAX && (
        <Button
          id="add-multi-choice-option-button"
          type="button"
          variant="primary"
          surface="light"
          icon={faPlus}
          value="Add another answer"
          onClick={handleAddOption}
        />
      )}
    </Stack>
  )
}

export default MultiChoiceAnswerEditor
