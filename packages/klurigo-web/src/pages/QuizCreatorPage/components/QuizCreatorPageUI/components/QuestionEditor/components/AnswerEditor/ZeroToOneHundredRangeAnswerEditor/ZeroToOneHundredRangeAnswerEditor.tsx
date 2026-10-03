import type { FC } from 'react'

import type { QuizQuestionValidationResult } from '../../../../../../../utils/QuestionDataSource'
import QuestionField, { QuestionFieldType } from '../../QuestionField'

export interface ZeroToOneHundredRangeAnswerEditorProps {
  value?: number
  min?: number
  max?: number
  layout?: 'full' | 'half'
  validation: QuizQuestionValidationResult
  validationRevealed?: boolean
  onChange: (value: number) => void
  footer?: string
}

const ZeroToOneHundredRangeAnswerEditor: FC<
  ZeroToOneHundredRangeAnswerEditorProps
> = (props) => (
  <QuestionField
    {...props}
    type={QuestionFieldType.RangeCorrect}
    label="Correct answer (0–100)"
  />
)

export default ZeroToOneHundredRangeAnswerEditor
