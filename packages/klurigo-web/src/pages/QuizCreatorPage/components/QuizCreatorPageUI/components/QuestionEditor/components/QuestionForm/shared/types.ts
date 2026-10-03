import type { QuestionDto } from '@klurigo/common'

import type {
  QuizQuestionModelFieldChangeFunction,
  QuizQuestionValidationResult,
} from '../../../../../../../utils/QuestionDataSource'

export interface QuestionFormProps<T extends QuestionDto> {
  question: Partial<T>
  questionValidation: QuizQuestionValidationResult
  validationRevealed?: boolean
  onChange: QuizQuestionModelFieldChangeFunction<T>
}
