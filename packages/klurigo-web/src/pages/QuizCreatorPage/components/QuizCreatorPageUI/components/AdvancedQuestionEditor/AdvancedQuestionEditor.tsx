import { GameMode } from '@klurigo/common'
import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'

import Textarea from '../../../../../../components/Textarea'
import type {
  QuizQuestionModel,
  QuizQuestionValidationResult,
} from '../../../../utils/QuestionDataSource'

import styles from './AdvancedQuestionEditor.module.scss'
import { parseQuestionsJson } from './utils'

export interface AdvancedQuestionEditorProps {
  gameMode: GameMode
  questions: QuizQuestionModel[]
  questionValidations: QuizQuestionValidationResult[]
  onChange: (questions: QuizQuestionModel[]) => void
}

const AdvancedQuestionEditor: FC<AdvancedQuestionEditorProps> = ({
  gameMode,
  questions,
  questionValidations,
  onChange,
}) => {
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(questions, null, 2),
  )
  const [jsonError, setJsonError] = useState<string>()

  const lastPropJsonRef = useRef<string>(JSON.stringify(questions, null, 2))
  const jsonTextRef = useRef<string>(JSON.stringify(questions, null, 2))

  useEffect(() => {
    const newQuestions = questions
    const newPropJson = JSON.stringify(newQuestions, null, 2)
    const questionsChanged = newPropJson !== lastPropJsonRef.current

    if (questionsChanged) {
      lastPropJsonRef.current = newPropJson
      jsonTextRef.current = newPropJson
      setJsonText(newPropJson)

      try {
        parseQuestionsJson(newQuestions, gameMode)
      } catch (err) {
        setJsonError((err as Error).message)
        return
      }
    }

    // Keep validation feedback in sync without replacing a user's local JSON error.
    if (questionsChanged || newPropJson === jsonTextRef.current) {
      const firstInvalid = questionValidations.find(
        (validation) => !validation.valid,
      )

      const error = firstInvalid?.errors?.[0]

      if (firstInvalid && error?.path && error?.message) {
        const index = questionValidations.indexOf(firstInvalid)
        setJsonError(`questions[${index}].${error.path}: ${error.message}`)
      } else {
        setJsonError(undefined)
      }
    }
  }, [gameMode, questions, questionValidations])

  const handleChange = (text: string) => {
    jsonTextRef.current = text
    setJsonText(text)
    setJsonError(undefined)

    try {
      const parsedJson = JSON.parse(text)
      const parsedQuestionsData = parseQuestionsJson(parsedJson, gameMode)
      onChange(parsedQuestionsData)
    } catch (err) {
      setJsonError((err as Error).message)
    }
  }

  return (
    <div className={styles.advancedQuestionEditor}>
      <Textarea
        id="json-textarea"
        type="code"
        placeholder="Questions"
        value={jsonText}
        onChange={handleChange}
        onAdditionalValidation={() => jsonError || true}
        forceValidate
      />
    </div>
  )
}

export default AdvancedQuestionEditor
