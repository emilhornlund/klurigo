import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { QUIZ_PUZZLE_VALUES_MAX, QUIZ_PUZZLE_VALUES_MIN } from '@klurigo/common'
import type { FC } from 'react'

import {
  Button,
  Stack,
  TextField,
  Typography,
} from '../../../../../../../../../components'
import type { QuizQuestionValidationResult } from '../../../../../../../utils/QuestionDataSource'
import { getValidationErrorMessage } from '../../../../../../../validation-rules'
import {
  AnswerOptionList,
  AnswerOptionRow,
  answerOptionStyles as styles,
  useAnswerValues,
} from '../shared'

import puzzleStyles from './PuzzleAnswerEditor.module.scss'

export interface PuzzleAnswerEditorProps {
  value?: string[]
  validation: QuizQuestionValidationResult
  validationRevealed?: boolean
  onChange: (values?: string[]) => void
}

const PuzzleAnswerEditor: FC<PuzzleAnswerEditorProps> = ({
  value: initialValues,
  validation,
  validationRevealed = false,
  onChange,
}) => {
  const { values, change, add, remove } = useAnswerValues(
    initialValues,
    QUIZ_PUZZLE_VALUES_MIN,
    QUIZ_PUZZLE_VALUES_MAX,
    onChange,
  )

  return (
    <Stack width="full" spacing="stack" className={puzzleStyles.answerOptions}>
      <Typography variant="control2" color="muted" noOpacity>
        Add at least 3 items in the correct order.
      </Typography>
      <AnswerOptionList>
        {values.map((value, index) => (
          <AnswerOptionRow key={`puzzle-value-${index}`}>
            <div className={styles.orderIdentifier}>{index + 1}</div>

            <div className={styles.content}>
              <TextField
                id={`puzzle-value-${index}-textfield`}
                type="text"
                placeholder={`Item ${index + 1}`}
                value={value}
                customErrorMessage={getValidationErrorMessage(
                  validation,
                  `values[${index}]`,
                )}
                onChange={(newValue) => change(index, newValue as string)}
                required="Enter a puzzle item."
                forceValidate={validationRevealed}
              />
            </div>

            <div className={styles.deleteAction}>
              <Button
                id={`puzzle-value-${index}-delete-button`}
                type="button"
                size="small"
                variant="plain"
                surface="light"
                icon={faTrash}
                disabled={values.length <= QUIZ_PUZZLE_VALUES_MIN}
                onClick={() => remove(index)}
              />
            </div>
          </AnswerOptionRow>
        ))}
      </AnswerOptionList>

      {values.length < QUIZ_PUZZLE_VALUES_MAX && (
        <Button
          id="add-puzzle-value-button"
          type="button"
          variant="primary"
          surface="light"
          icon={faPlus}
          value="Add another item"
          onClick={add}
        />
      )}
    </Stack>
  )
}

export default PuzzleAnswerEditor
