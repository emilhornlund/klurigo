import { faTrash } from '@fortawesome/free-solid-svg-icons'
import type { QuestionDto } from '@klurigo/common'
import { GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import { Button, ConfirmDialog, Typography } from '../../../../../../components'
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
  selectedQuestionIndex: number
  questionCount: number
  onDeleteQuestionIndex: (index: number) => void
}

const QuestionSettings: FC<QuestionSettingsProps> = ({
  mode,
  question,
  questionValidation,
  onQuestionValueChange,
  onReplaceQuestion,
  selectedQuestionIndex,
  questionCount,
  onDeleteQuestionIndex,
}) => {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  const canDelete =
    questionCount > 1 &&
    selectedQuestionIndex >= 0 &&
    selectedQuestionIndex < questionCount

  const handleDeleteQuestion = () => {
    if (canDelete) {
      onDeleteQuestionIndex(selectedQuestionIndex)
      setShowDeleteConfirmation(false)
    }
  }

  return (
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
      <section className={styles.additionalContent}>
        <Typography variant="title5" align="left">
          Additional content
        </Typography>
        <QuestionField
          type={QuestionFieldType.CommonInfo}
          value={question.info}
          validation={questionValidation}
          onChange={(newValue) => onQuestionValueChange('info', newValue)}
        />
      </section>
      <div className={styles.deleteQuestion}>
        <Button
          id="delete-question-button"
          type="button"
          size="small"
          surface="light"
          intent="danger"
          icon={faTrash}
          value="Delete question"
          disabled={!canDelete}
          onClick={() => setShowDeleteConfirmation(true)}
        />
      </div>
      <ConfirmDialog
        title="Delete quiz question"
        message="Are you sure you want to delete this question? This action can't be undone."
        open={showDeleteConfirmation}
        confirmTitle="Delete"
        onConfirm={handleDeleteQuestion}
        onClose={() => setShowDeleteConfirmation(false)}
        destructive
      />
    </aside>
  )
}

export default QuestionSettings
