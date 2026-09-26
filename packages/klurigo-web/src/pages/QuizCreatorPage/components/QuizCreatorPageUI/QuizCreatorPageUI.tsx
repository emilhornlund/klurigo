import {
  faChevronLeft,
  faChevronRight,
  faCode,
  faSliders,
} from '@fortawesome/free-solid-svg-icons'
import type { QuestionDto } from '@klurigo/common'
import { GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import { Button, Page, Stack } from '../../../../components'
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
  QuizEditorHeader,
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
  const [showQuizSettingsModal, setShowQuizSettingsModal] = useState(false)

  const [showAdvancedQuestionEditor, setShowAdvancedQuestionEditor] =
    useState(false)

  return (
    <Page
      layout="fullBleed"
      header={
        <QuizEditorHeader
          quizSettings={quizSettings}
          quizSettingsValidation={quizSettingsValidation}
          onQuizSettingsValueChange={onQuizSettingsValueChange}
          canSaveQuiz={canSaveQuiz}
          isSavingQuiz={isSavingQuiz}
          onOpenSettings={() => setShowQuizSettingsModal(true)}
          onSaveQuiz={onSaveQuiz}
          onExit={onExit}
        />
      }
      footer={
        gameMode && selectedQuestion && !showAdvancedQuestionEditor ? (
          <nav
            className={styles.questionNavigation}
            aria-label="Question navigation">
            <Button
              id="previous-question-button"
              type="button"
              size="small"
              value="Previous question"
              icon={faChevronLeft}
              disabled={selectedQuestionIndex <= 0}
              onClick={() => onSelectedQuestionIndex(selectedQuestionIndex - 1)}
            />
            <span>{`Question ${selectedQuestionIndex + 1} of ${questions.length}`}</span>
            <Button
              id="next-question-button"
              type="button"
              size="small"
              value="Next question"
              icon={faChevronRight}
              iconPosition="trailing"
              disabled={selectedQuestionIndex >= questions.length - 1}
              onClick={() => onSelectedQuestionIndex(selectedQuestionIndex + 1)}
            />
          </nav>
        ) : undefined
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
