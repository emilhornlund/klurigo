import type { QuestionDto } from '@klurigo/common'
import { GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import type {
  QuizQuestionModel,
  QuizQuestionModelFieldChangeFunction,
  QuizQuestionValidationResult,
} from '../../../../utils/QuestionDataSource'
import EditorPanel from '../EditorPanel'
import { QuestionField, QuestionFieldType } from '../QuestionEditor/components'

import styles from './QuestionSettings.module.scss'

export interface QuestionSettingsProps {
  mode: GameMode
  question: QuizQuestionModel
  questionValidation: QuizQuestionValidationResult
  validationRevealed?: boolean
  onQuestionValueChange: QuizQuestionModelFieldChangeFunction<QuestionDto>
  onReplaceQuestion: (type: QuestionType) => void
}

const QuestionSettings: FC<QuestionSettingsProps> = ({
  mode,
  question,
  questionValidation,
  validationRevealed,
  onQuestionValueChange,
  onReplaceQuestion,
}) => {
  const questionSettingsContent = (
    <>
      {mode === GameMode.Classic && (
        <QuestionField
          type={QuestionFieldType.CommonType}
          value={question.type}
          validation={questionValidation}
          validationRevealed={validationRevealed}
          onChange={onReplaceQuestion}
        />
      )}

      <QuestionField
        type={QuestionFieldType.CommonDuration}
        value={question.duration}
        validation={questionValidation}
        validationRevealed={validationRevealed}
        onChange={(newValue) => onQuestionValueChange('duration', newValue)}
      />

      {mode === GameMode.Classic && question.type !== QuestionType.Pin && (
        <QuestionField
          type={QuestionFieldType.CommonPoints}
          value={'points' in question ? question.points : undefined}
          validation={questionValidation}
          validationRevealed={validationRevealed}
          onChange={(newValue) => onQuestionValueChange('points', newValue)}
        />
      )}
    </>
  )

  const answerExplanation = (
    <QuestionField
      type={QuestionFieldType.CommonInfo}
      value={question.info}
      validation={questionValidation}
      validationRevealed={validationRevealed}
      onChange={(newValue) => onQuestionValueChange('info', newValue)}
    />
  )

  return (
    <aside className={styles.questionSettings} aria-label="Question settings">
      <EditorPanel title="Question settings">
        {questionSettingsContent}
      </EditorPanel>

      <EditorPanel title="Answer explanation">{answerExplanation}</EditorPanel>
    </aside>
  )
}

export default QuestionSettings
