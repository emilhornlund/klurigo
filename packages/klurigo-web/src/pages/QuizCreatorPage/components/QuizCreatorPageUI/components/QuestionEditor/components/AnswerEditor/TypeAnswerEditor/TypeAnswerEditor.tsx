import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import {
  QUIZ_TYPE_ANSWER_OPTIONS_MAX,
  QUIZ_TYPE_ANSWER_OPTIONS_MIN,
} from '@klurigo/common'
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

import typeAnswerStyles from './TypeAnswerEditor.module.scss'

export interface TypeAnswerEditorProps {
  values?: string[]
  validation: QuizQuestionValidationResult
  validationRevealed?: boolean
  onChange: (values?: string[]) => void
}

const TypeAnswerEditor: FC<TypeAnswerEditorProps> = ({
  values,
  validation,
  validationRevealed = false,
  onChange,
}) => {
  const {
    values: options,
    change,
    add,
    remove,
  } = useAnswerValues(
    values,
    QUIZ_TYPE_ANSWER_OPTIONS_MIN,
    QUIZ_TYPE_ANSWER_OPTIONS_MAX,
    onChange,
  )

  return (
    <Stack
      width="full"
      spacing="stack"
      className={typeAnswerStyles.answerOptions}>
      <Typography variant="control2" color="muted" noOpacity>
        Add one or more answers players may enter.
      </Typography>
      <AnswerOptionList>
        {options.map((option, index) => (
          <AnswerOptionRow key={`type-answer-option-${index}`}>
            <div className={styles.content}>
              <TextField
                id={`type-answer-option-${index}-textfield`}
                type="text"
                placeholder={`Answer ${index + 1}`}
                value={option}
                customErrorMessage={getValidationErrorMessage(
                  validation,
                  `options[${index}]`,
                )}
                onChange={(newValue) => change(index, newValue as string)}
                required="Enter an accepted answer."
                forceValidate={validationRevealed}
              />
            </div>

            <div className={styles.deleteAction}>
              <Button
                id={`type-answer-option-${index}-delete-button`}
                type="button"
                size="small"
                variant="plain"
                surface="light"
                icon={faTrash}
                disabled={options.length <= QUIZ_TYPE_ANSWER_OPTIONS_MIN}
                onClick={() => remove(index)}
              />
            </div>
          </AnswerOptionRow>
        ))}
      </AnswerOptionList>

      {options.length < QUIZ_TYPE_ANSWER_OPTIONS_MAX && (
        <Button
          id="add-type-answer-option-button"
          type="button"
          variant="primary"
          surface="light"
          icon={faPlus}
          value="Add another answer"
          onClick={add}
        />
      )}
    </Stack>
  )
}

export default TypeAnswerEditor
