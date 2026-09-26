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
  onQuestionValueChange,
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
    <QuestionField
      type={QuestionFieldType.CommonDuration}
      value={question.duration}
      validation={questionValidation}
      onChange={(newValue) => onQuestionValueChange('duration', newValue)}
    />
    {mode === GameMode.Classic && (
      <QuestionField
        type={QuestionFieldType.CommonPoints}
        value={'points' in question ? question.points : undefined}
        validation={questionValidation}
        onChange={(newValue) => onQuestionValueChange('points', newValue)}
      />
    )}
  </aside>
)

export default QuestionSettings
