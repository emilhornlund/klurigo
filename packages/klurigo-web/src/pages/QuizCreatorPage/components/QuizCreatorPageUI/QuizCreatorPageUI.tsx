import {
  faArrowRightFromBracket,
  faCode,
  faFloppyDisk,
  faGear,
  faSliders,
} from '@fortawesome/free-solid-svg-icons'
import type { QuestionDto } from '@klurigo/common'
import { GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import { Button, Page, Stack, TextField } from '../../../../components'
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
  onQuizSettingsValueChange: QuizSettingsModelFieldChangeFunction
  questions: QuizQuestionModel[]
  questionValidations: QuizQuestionValidationResult[]
  onSetQuestions: (questions: QuizQuestionModel[]) => void
  selectedQuestion?: QuizQuestionModel
  selectedQuestionIndex: number
  canSaveQuiz: boolean
  isSavingQuiz?: boolean
  onSelectedQuestionIndex: (index: number) => void
  onAddQuestion: () => void
  onQuestionValueChange: QuizQuestionModelFieldChangeFunction<QuestionDto>
  onDropQuestionIndex: (index: number) => void
  onDuplicateQuestionIndex: (index: number) => void
  onDeleteQuestionIndex: (index: number) => void
  onReplaceQuestion: (type: QuestionType) => void
  onSaveQuiz: () => void
  onExit: () => void
}

const QuizCreatorPageUI: FC<QuizCreatorPageUIProps> = ({
  gameMode,
  onSelectGameMode,
  quizSettings,
  quizSettingsValidation,
  onQuizSettingsValueChange,
  questions,
  questionValidations,
  onSetQuestions,
  selectedQuestion,
  selectedQuestionIndex,
  canSaveQuiz,
  isSavingQuiz,
  onSelectedQuestionIndex,
  onAddQuestion,
  onQuestionValueChange,
  onDropQuestionIndex,
  onDuplicateQuestionIndex,
  onDeleteQuestionIndex,
  onReplaceQuestion,
  onSaveQuiz,
  onExit,
}) => {
  const deviceType = useDeviceSizeType()

  const [showQuizSettingsModal, setShowQuizSettingsModal] = useState(false)

  const [showAdvancedQuestionEditor, setShowAdvancedQuestionEditor] =
    useState(false)

  return (
    <Page
      layout="fullBleed"
      header={
        <>
          {deviceType !== DeviceType.Mobile && (
            <TextField
              id="quiz-title-textfield"
              type="text"
              surface="light"
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
            variant="primary"
            surface="brand"
            value="Settings"
            hideValue="mobile"
            icon={faGear}
            onClick={() => setShowQuizSettingsModal(true)}
          />
          <Button
            id="save-button"
            type="button"
            size="small"
            variant="primary"
            intent="accent"
            value="Save"
            hideValue="mobile"
            icon={faFloppyDisk}
            loading={!!isSavingQuiz}
            disabled={!canSaveQuiz}
            onClick={onSaveQuiz}
          />
          <Button
            id="exit-button"
            type="button"
            size="small"
            variant="primary"
            surface="brand"
            value="Exit"
            hideValue="mobile"
            icon={faArrowRightFromBracket}
            onClick={onExit}
          />
        </>
      }
      disableContentFadeAnimation>
      <Stack className={styles.quizCreatorPage} width="full">
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
          <div className={styles.workspace} data-testid="editor-workspace">
            <nav className={styles.questionNavigator} aria-label="Questions">
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
            </nav>
            <main
              className={styles.questionEditor}
              aria-label="Question editor">
              <QuestionEditor
                mode={gameMode}
                question={selectedQuestion}
                questionValidation={questionValidations[selectedQuestionIndex]}
                onQuestionValueChange={onQuestionValueChange}
                onTypeChange={onReplaceQuestion}
              />
            </main>
            <aside
              className={styles.questionSettings}
              aria-label="Question settings">
              Question settings
            </aside>
          </div>
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
      </Stack>
    </Page>
  )
}

export default QuizCreatorPageUI
