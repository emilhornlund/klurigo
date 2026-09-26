import type { QuestionDto } from '@klurigo/common'
import type { QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import type {
  QuizQuestionModel,
  QuizQuestionModelFieldChangeFunction,
  QuizQuestionValidationResult,
} from '../../../../utils/QuestionDataSource'

import styles from './QuestionSettings.module.scss'

export interface QuestionSettingsProps {
  question: QuizQuestionModel
  questionValidation: QuizQuestionValidationResult
  onQuestionValueChange: QuizQuestionModelFieldChangeFunction<QuestionDto>
  onReplaceQuestion: (type: QuestionType) => void
}

const QuestionSettings: FC<QuestionSettingsProps> = () => (
  <aside className={styles.questionSettings} aria-label="Question settings">
    Question settings
  </aside>
)

export default QuestionSettings
