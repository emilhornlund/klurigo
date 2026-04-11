import {
  faCode,
  faFloppyDisk,
  faGear,
  faSliders,
} from '@fortawesome/free-solid-svg-icons'
import type { QuestionDto } from '@klurigo/common'
import { GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'
import { useMemo, useState } from 'react'

import { Button, Page, TextField } from '../../../../components'
import { DeviceType } from '../../../../utils/device-size.types'
import { useDeviceSizeType } from '../../../../utils/useDeviceSizeType'
import type {
  QuizQuestionModel,
  QuizQuestionModelFieldChangeFunction,
  QuizQuestionValidationResult,
} from '../../utils/QuestionDataSource'
import type {
  QuizSettingsModel,
  QuizSettingsModelFieldChangeFunction,
  QuizSettingsValidationResult,
} from '../../utils/QuizSettingsDataSource'

import {
  AdvancedQuestionEditor,
  GameModeSelectionModal,
  QuestionEditor,
  QuestionPicker,
} from './components'
import QuizSettingsModal from './components/QuizSettingsModal'
import styles from './QuizCreatorPageUI.module.scss'

export interface QuizCreatorPageUIProps {
  gameMode?: GameMode
  onSelectGameMode?: (gameMode: GameMode) => void
  quizSettings: QuizSettingsModel
  quizSettingsValidation: QuizSettingsValidationResult
  allQuizSettingsValid: boolean
  onQuizSettingsValueChange: QuizSettingsModelFieldChangeFunction
  questions: QuizQuestionModel[]
  questionValidations: QuizQuestionValidationResult[]
  onSetQuestions: (questions: QuizQuestionModel[]) => void
  allQuestionsValid: boolean
  selectedQuestion?: QuizQuestionModel
  selectedQuestionIndex: number
  onSelectedQuestionIndex: (index: number) => void
  onAddQuestion: () => void
  onQuestionValueChange: QuizQuestionModelFieldChangeFunction<QuestionDto>
  onDropQuestionIndex: (index: number) => void
  onDuplicateQuestionIndex: (index: number) => void
  onDeleteQuestionIndex: (index: number) => void
  onReplaceQuestion: (type: QuestionType) => void
  isSavingQuiz?: boolean
  onSaveQuiz: () => void
}

const QuizCreatorPageUI: FC<QuizCreatorPageUIProps> = ({
  gameMode,
  onSelectGameMode,
  quizSettings,
  quizSettingsValidation,
  allQuizSettingsValid,
  onQuizSettingsValueChange,
  questions,
  questionValidations,
  onSetQuestions,
  allQuestionsValid,
  selectedQuestion,
  selectedQuestionIndex,
  onSelectedQuestionIndex,
  onAddQuestion,
  onQuestionValueChange,
  onDropQuestionIndex,
  onDuplicateQuestionIndex,
  onDeleteQuestionIndex,
  onReplaceQuestion,
  isSavingQuiz,
  onSaveQuiz,
}) => {
  const deviceType = useDeviceSizeType()

  const [showQuizSettingsModal, setShowQuizSettingsModal] = useState(false)

  const [showAdvancedQuestionEditor, setShowAdvancedQuestionEditor] =
    useState(false)

  const isValid = useMemo(
    () => allQuestionsValid && allQuizSettingsValid,
    [allQuestionsValid, allQuizSettingsValid],
  )

  return (
    <Page
      height="full"
      header={
        <div className={styles.quizCreatorPageHeader}>
          {deviceType !== DeviceType.Mobile && (
            <TextField
              id="quiz-title-textfield"
              type="text"
              kind="secondary"
              size="small"
              placeholder="Title"
              value={quizSettings.title}
              onChange={(value) =>
                onQuizSettingsValueChange('title', value as string)
              }
              customErrorMessage={
                quizSettingsValidation.errors.filter(
                  ({ path }) => path === 'title',
                )?.[0]?.message
              }
              showErrorMessage={false}
              forceValidate
            />
          )}
          <Button
            id="settings-button"
            type="button"
            size="small"
            kind="primary"
            value="Settings"
            hideValue="mobile"
            icon={faGear}
            onClick={() => setShowQuizSettingsModal(true)}
          />
          <Button
            id="save-button"
            type="button"
            size="small"
            kind="call-to-action"
            value="Save"
            hideValue="mobile"
            icon={faFloppyDisk}
            loading={!!isSavingQuiz}
            disabled={!isValid}
            onClick={onSaveQuiz}
          />
        </div>
      }
      disableContentFadeAnimation>
      <div className={styles.quizCreatorPage}>
        {!gameMode && <GameModeSelectionModal onSelect={onSelectGameMode} />}

        {gameMode && showQuizSettingsModal && (
          <QuizSettingsModal
            values={quizSettings}
            validation={quizSettingsValidation}
            onValueChange={onQuizSettingsValueChange}
            onClose={() => setShowQuizSettingsModal(false)}
          />
        )}

        {gameMode && selectedQuestion && !showAdvancedQuestionEditor && (
          <>
            <QuestionPicker
              questions={questions.map((question, index) => ({
                type: question.type as QuestionType,
                text: question.question,
                valid: questionValidations[index].valid,
              }))}
              selectedQuestionIndex={selectedQuestionIndex}
              onAddQuestion={onAddQuestion}
              onSelectQuestion={onSelectedQuestionIndex}
              onDropQuestion={onDropQuestionIndex}
              onDuplicateQuestion={onDuplicateQuestionIndex}
              onDeleteQuestion={onDeleteQuestionIndex}
            />
            <QuestionEditor
              mode={gameMode}
              question={selectedQuestion}
              questionValidation={questionValidations[selectedQuestionIndex]}
              onQuestionValueChange={onQuestionValueChange}
              onTypeChange={onReplaceQuestion}
            />
          </>
        )}

        {gameMode && showAdvancedQuestionEditor && (
          <AdvancedQuestionEditor
            gameMode={gameMode}
            questions={questions}
            questionValidations={questionValidations}
            onChange={onSetQuestions}
          />
        )}

        {gameMode && (
          <div className={styles.editorToggleSection}>
            <div className={styles.divider} />
            <div className={styles.toggleButtonWrapper}>
              <Button
                id="toggle-editor-button"
                type="button"
                size="small"
                value={
                  showAdvancedQuestionEditor
                    ? 'Show Simple Editor'
                    : 'Show Advanced Editor'
                }
                icon={showAdvancedQuestionEditor ? faSliders : faCode}
                onClick={() =>
                  setShowAdvancedQuestionEditor(!showAdvancedQuestionEditor)
                }
              />
            </div>
          </div>
        )}
      </div>
    </Page>
  )
}

export default QuizCreatorPageUI
