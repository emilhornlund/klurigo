import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'
import { useCallback, useEffect, useState } from 'react'

import {
  Stack,
  TextField,
  Typography,
} from '../../../../../../../../../components'
import type { QuizQuestionValidationResult } from '../../../../../../../utils/QuestionDataSource'
import {
  AnswerOptionGroupError,
  AnswerOptionList,
  AnswerOptionRow,
  answerOptionStyles as styles,
} from '../shared'

import trueFalseStyles from './TrueFalseAnswerEditor.module.scss'

export interface TrueFalseAnswerEditorProps {
  value?: boolean
  validation: QuizQuestionValidationResult
  validationRevealed?: boolean
  onChange: (value?: boolean) => void
}

const TrueFalseAnswerEditor: FC<TrueFalseAnswerEditorProps> = ({
  value,
  validationRevealed = false,
  onChange,
}) => {
  const [selectionInteracted, setSelectionInteracted] = useState(false)

  const [options, setOptions] = useState<
    { id: 'true' | 'false'; value: string; correct: boolean }[]
  >(() => [
    { id: 'true', value: 'True', correct: value === true },
    { id: 'false', value: 'False', correct: value === false },
  ])

  useEffect(() => {
    setOptions((prev) =>
      prev.map((opt) => ({
        ...opt,
        correct: opt.id === 'true' ? value === true : value === false,
      })),
    )
  }, [value])

  const handleChange = useCallback(
    (updatedIndex: number, checked: boolean) => {
      setSelectionInteracted(true)

      setOptions((prev) => {
        const next = prev.map((option, index) =>
          index === updatedIndex
            ? { ...option, correct: checked }
            : { ...option, correct: checked ? false : option.correct },
        )

        const selected = next.find((option) => option.correct)

        onChange(selected ? selected.id === 'true' : undefined)

        return next
      })
    },
    [onChange],
  )

  const hasCorrectAnswer = options.some((option) => option.correct)

  const correctAnswerError =
    'Select either True or False as the correct answer.'

  const showCorrectAnswerError =
    !hasCorrectAnswer && (selectionInteracted || validationRevealed)

  return (
    <Stack
      width="full"
      spacing="stack"
      className={trueFalseStyles.answerOptions}>
      <Typography variant="control2" color="muted" noOpacity>
        Select whether the statement is true or false.
      </Typography>
      <AnswerOptionList>
        {options.map((option, index) => {
          const checkboxId = `true-false-option-${index}-correct-checkbox`

          return (
            <AnswerOptionRow key={option.id}>
              <div className={styles.optionIdentifier}>
                {String.fromCharCode(65 + index)}
              </div>

              <div className={styles.content}>
                <TextField
                  id={`true-false-option-${index}-textfield`}
                  type="text"
                  value={option.value}
                  readOnly
                />
              </div>

              <div className={styles.correctAnswer}>
                <label
                  htmlFor={checkboxId}
                  className={styles.correctAnswerLabel}>
                  <input
                    id={checkboxId}
                    type="radio"
                    name="true-false-correct-answer"
                    checked={option.correct}
                    aria-label={`Mark ${option.value} as correct`}
                    onChange={() => handleChange(index, true)}
                  />

                  {option.correct && (
                    <FontAwesomeIcon
                      icon={faCheck}
                      className={styles.correctAnswerIcon}
                    />
                  )}
                </label>
              </div>
            </AnswerOptionRow>
          )
        })}

        {showCorrectAnswerError && (
          <AnswerOptionGroupError message={correctAnswerError} />
        )}
      </AnswerOptionList>
    </Stack>
  )
}

export default TrueFalseAnswerEditor
