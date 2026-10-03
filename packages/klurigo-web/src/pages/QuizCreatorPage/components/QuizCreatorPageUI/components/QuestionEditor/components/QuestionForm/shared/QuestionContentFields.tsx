import type { QuestionDto, QuestionMediaDto } from '@klurigo/common'
import type { FC } from 'react'

import type { QuizQuestionValidationResult } from '../../../../../../../utils/QuestionDataSource'
import QuestionField, { QuestionFieldType } from '../../QuestionField'
import { EditorSection } from '../../shared'

export const QuestionTextField: FC<{
  question: Partial<QuestionDto>
  validation: QuizQuestionValidationResult
  validationRevealed?: boolean
  onChange: (value: string) => void
}> = ({ question, validation, validationRevealed, onChange }) => (
  <EditorSection>
    <QuestionField
      type={QuestionFieldType.CommonQuestion}
      value={question.question}
      validation={validation}
      validationRevealed={validationRevealed}
      onChange={onChange}
    />
  </EditorSection>
)

export const QuestionMediaField: FC<{
  question: { media?: QuestionMediaDto; duration?: number }
  validation: QuizQuestionValidationResult
  onChange: (value?: QuestionMediaDto) => void
}> = ({ question, validation, onChange }) => (
  <EditorSection>
    <QuestionField
      type={QuestionFieldType.CommonMedia}
      value={question.media}
      duration={question.duration}
      validation={validation}
      onChange={onChange}
    />
  </EditorSection>
)

export const QuestionContentFields: FC<{
  question: { question?: string; media?: QuestionMediaDto; duration?: number }
  validation: QuizQuestionValidationResult
  validationRevealed?: boolean
  onQuestionChange: (value: string) => void
  onMediaChange: (value?: QuestionMediaDto) => void
}> = ({
  question,
  validation,
  validationRevealed,
  onQuestionChange,
  onMediaChange,
}) => (
  <>
    <QuestionTextField
      question={question}
      validation={validation}
      validationRevealed={validationRevealed}
      onChange={onQuestionChange}
    />
    <QuestionMediaField
      question={question}
      validation={validation}
      onChange={onMediaChange}
    />
  </>
)
