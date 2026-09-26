import type { QuestionDto } from '@klurigo/common'
import { GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import type {
  QuizQuestionModel,
  QuizQuestionModelFieldChangeFunction,
  QuizQuestionValidationResult,
} from '../../../../utils/QuestionDataSource'
import { QuestionField, QuestionFieldType } from '../QuestionEditor/components'

import styles from './QuestionSettings.module.scss'

export interface QuestionSettingsProps {
  mode: GameMode
  question: QuizQuestionModel
  questionValidation: QuizQuestionValidationResult
  onQuestionValueChange: QuizQuestionModelFieldChangeFunction<QuestionDto>
  onReplaceQuestion: (type: QuestionType) => void
}

const QuestionSettings: FC<QuestionSettingsProps> = ({
  mode,
  question,
  questionValidation,
  onReplaceQuestion,
}) => (
  <aside className={styles.questionSettings} aria-label="Question settings">
    Question settings
    {mode === GameMode.Classic && (
      <QuestionField
        type={QuestionFieldType.CommonType}
        value={question.type}
        validation={questionValidation}
        onChange={onReplaceQuestion}
      />
    )}
  </aside>
)

export default QuestionSettings
