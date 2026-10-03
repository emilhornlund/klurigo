import type { QuestionDto } from '@klurigo/common'
import { GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'
import { useCallback, useState } from 'react'

import { Page, Stack } from '../../../../components'
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
  EditorPanel,
  GameModeSelectionModal,
  QuestionEditor,
  QuestionNavigation,
  QuestionPicker,
  QuestionSettings,
  QuizEditorHeader,
} from './components'
import QuizSettingsModal from './components/QuizSettingsModal'
import { addRevealedQuestionId } from './questionValidation'
import styles from './QuizCreatorPageUI.module.scss'

export interface QuizCreatorPageUIProps {
  gameMode?: GameMode
  onSelectGameMode?: (gameMode: GameMode) => void
  quizSettings: QuizSettingsModel
  quizSettingsValidation: QuizSettingsValidationResult
  onQuizSettingsValueChange: QuizSettingsModelFieldChangeFunction
  questions: QuizQuestionModel[]
  questionIds: string[]
  questionValidations: QuizQuestionValidationResult[]
  onSetQuestions: (questions: QuizQuestionModel[]) => void
  selectedQuestion?: QuizQuestionModel
  selectedQuestionIndex: number
  canSaveQuiz: boolean
  isSavingQuiz?: boolean
  onSelectedQuestionIndex: (index: number) => void
  onAddQuestion: () => void
  onQuestionValueChange: QuizQuestionModelFieldChangeFunction<QuestionDto>
  onMoveQuestion: (fromIndex: number, toIndex: number) => void
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
  questionIds,
  questionValidations,
  onSetQuestions,
  selectedQuestion,
  selectedQuestionIndex,
  canSaveQuiz,
  isSavingQuiz,
  onSelectedQuestionIndex,
  onAddQuestion,
  onQuestionValueChange,
  onMoveQuestion,
  onDuplicateQuestionIndex,
  onDeleteQuestionIndex,
  onReplaceQuestion,
  onSaveQuiz,
  onExit,
}) => {
  const [showQuizSettingsModal, setShowQuizSettingsModal] = useState(false)

  const [revealedQuestionIds, setRevealedQuestionIds] = useState<Set<string>>(
    () => new Set(),
  )

  const [showAdvancedQuestionEditor, setShowAdvancedQuestionEditor] =
    useState(false)

  const selectedQuestionId = questionIds[selectedQuestionIndex]
  const validationRevealed =
    selectedQuestionId !== undefined &&
    revealedQuestionIds.has(selectedQuestionId)

  const revealQuestionValidation = useCallback((questionId: string) => {
    setRevealedQuestionIds((current) =>
      addRevealedQuestionId(current, questionId),
    )
  }, [])

  const handleSelectedQuestionIndex = useCallback(
    (nextIndex: number) => {
      const currentQuestionId = questionIds[selectedQuestionIndex]
      const currentQuestionValidation =
        questionValidations[selectedQuestionIndex]

      if (currentQuestionId && !currentQuestionValidation?.valid) {
        revealQuestionValidation(currentQuestionId)
      }

      onSelectedQuestionIndex(nextIndex)
    },
    [
      onSelectedQuestionIndex,
      questionIds,
      questionValidations,
      revealQuestionValidation,
      selectedQuestionIndex,
    ],
  )

  const handleDeleteQuestionIndex = useCallback(
    (index: number) => {
      const questionId = questionIds[index]
      if (questionId) {
        setRevealedQuestionIds((current) => {
          if (!current.has(questionId)) return current
          const next = new Set(current)
          next.delete(questionId)
          return next
        })
      }
      onDeleteQuestionIndex(index)
    },
    [onDeleteQuestionIndex, questionIds],
  )

  const handleReplaceQuestion = useCallback(
    (type: QuestionType) => {
      if (selectedQuestionId) {
        setRevealedQuestionIds((current) => {
          if (!current.has(selectedQuestionId)) return current
          const next = new Set(current)
          next.delete(selectedQuestionId)
          return next
        })
      }
      onReplaceQuestion(type)
    },
    [onReplaceQuestion, selectedQuestionId],
  )

  const handleSaveQuiz = useCallback(() => {
    const invalidQuestionIndices = questionValidations.flatMap(
      (validation, index) => (validation.valid ? [] : [index]),
    )
    const invalidQuestions = invalidQuestionIndices.flatMap((index) => {
      const questionId = questionIds[index]
      return questionId === undefined ? [] : [{ index, questionId }]
    })

    if (invalidQuestions.length > 0) {
      setRevealedQuestionIds((current) =>
        invalidQuestions.reduce(
          (revealed, questionId) =>
            addRevealedQuestionId(revealed, questionId.questionId),
          current,
        ),
      )
      onSelectedQuestionIndex(invalidQuestions[0].index)
    }

    onSaveQuiz()
  }, [onSaveQuiz, onSelectedQuestionIndex, questionIds, questionValidations])

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
          showAdvancedQuestionEditor={showAdvancedQuestionEditor}
          onOpenSettings={() => setShowQuizSettingsModal(true)}
          onToggleAdvancedQuestionEditor={() =>
            setShowAdvancedQuestionEditor(!showAdvancedQuestionEditor)
          }
          onSaveQuiz={handleSaveQuiz}
          onExit={onExit}
        />
      }
      footer={
        gameMode && selectedQuestion && !showAdvancedQuestionEditor ? (
          <QuestionNavigation
            selectedQuestionIndex={selectedQuestionIndex}
            totalQuestions={questions.length}
            onSelectedQuestionIndex={handleSelectedQuestionIndex}
          />
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
            <EditorPanel
              as="nav"
              title="Questions"
              className={styles.questionNavigator}>
              <QuestionPicker
                questions={questions.map((question, index) => ({
                  id: questionIds[index],
                  type: question.type as QuestionType,
                  text: question.question,
                  valid: questionValidations[index].valid,
                }))}
                selectedQuestionIndex={selectedQuestionIndex}
                onAddQuestion={onAddQuestion}
                onSelectQuestion={handleSelectedQuestionIndex}
                onMoveQuestion={onMoveQuestion}
                onDuplicateQuestion={onDuplicateQuestionIndex}
                onDeleteQuestion={handleDeleteQuestionIndex}
              />
            </EditorPanel>
            <EditorPanel as="main" className={styles.questionEditor}>
              <QuestionEditor
                key={selectedQuestionId}
                mode={gameMode}
                question={selectedQuestion}
                questionValidation={questionValidations[selectedQuestionIndex]}
                validationRevealed={validationRevealed}
                onQuestionValueChange={onQuestionValueChange}
              />
            </EditorPanel>
            <QuestionSettings
              key={selectedQuestionId}
              mode={gameMode}
              question={selectedQuestion}
              questionValidation={questionValidations[selectedQuestionIndex]}
              validationRevealed={validationRevealed}
              onQuestionValueChange={onQuestionValueChange}
              onReplaceQuestion={handleReplaceQuestion}
            />
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
      </Stack>
    </Page>
  )
}

export default QuizCreatorPageUI
