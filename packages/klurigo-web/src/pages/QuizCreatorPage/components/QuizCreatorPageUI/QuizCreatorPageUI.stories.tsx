import { GameMode, QuestionType } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import type { FC } from 'react'
import { withRouter } from 'storybook-addon-remix-react-router'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'
import type { QuizQuestionValidationResult } from '../../utils/QuestionDataSource'
import { useQuestionDataSource } from '../../utils/QuestionDataSource'
import type { QuizSettingsValidationResult } from '../../utils/QuizSettingsDataSource'
import { useQuizSettingsDataSource } from '../../utils/QuizSettingsDataSource'

import QuizCreatorPageUI, {
  type QuizCreatorPageUIProps,
} from './QuizCreatorPageUI'

const QuizCreatorPageUIStoryComponent: FC<QuizCreatorPageUIProps> = () => {
  const {
    settings: quizSettings,
    settingsValidation: quizSettingsValidation,
    updateSettingsField: onQuizSettingsValueChange,
  } = useQuizSettingsDataSource()

  const {
    gameMode,
    setGameMode,
    questions,
    questionIds,
    setQuestions,
    questionValidations,
    selectedQuestion,
    selectedQuestionIndex,
    selectQuestion,
    addQuestion,
    updateSelectedQuestionField,
    moveQuestion,
    duplicateQuestion,
    deleteQuestion,
    replaceQuestion,
  } = useQuestionDataSource()

  const hasUnsavedChanges =
    !!gameMode ||
    (quizSettings.title?.trim() ?? '') !== '' ||
    (quizSettings.description?.trim() ?? '') !== '' ||
    !!quizSettings.imageCoverURL ||
    questions.length > 0

  const handleAddQuestion = (): void => {
    if (gameMode === GameMode.Classic) {
      addQuestion(QuestionType.MultiChoice)
    }
    if (gameMode === GameMode.ZeroToOneHundred) {
      addQuestion(QuestionType.Range)
    }
  }

  return (
    <QuizCreatorPageUI
      gameMode={gameMode}
      onSelectGameMode={setGameMode}
      quizSettings={quizSettings}
      quizSettingsValidation={quizSettingsValidation}
      onQuizSettingsValueChange={onQuizSettingsValueChange}
      questions={questions}
      questionIds={questionIds}
      questionValidations={questionValidations}
      selectedQuestion={selectedQuestion}
      selectedQuestionIndex={selectedQuestionIndex}
      canSaveQuiz={hasUnsavedChanges}
      onSetQuestions={setQuestions}
      onSelectedQuestionIndex={selectQuestion}
      onAddQuestion={handleAddQuestion}
      onQuestionValueChange={updateSelectedQuestionField}
      onMoveQuestion={moveQuestion}
      onDuplicateQuestionIndex={duplicateQuestion}
      onDeleteQuestionIndex={deleteQuestion}
      onReplaceQuestion={replaceQuestion}
      onSaveQuiz={() => undefined}
      onExit={() => undefined}
    />
  )
}

const meta = {
  title: 'Pages/QuizCreatorPage',
  component: QuizCreatorPageUI,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => <QuizCreatorPageUIStoryComponent {...args} />,
} satisfies Meta<typeof QuizCreatorPageUI>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    quizSettings: {},
    quizSettingsValidation: {} as QuizSettingsValidationResult,
    questions: [],
    questionIds: [],
    questionValidations: [] as QuizQuestionValidationResult[],
    selectedQuestion: undefined,
    selectedQuestionIndex: -1,
    canSaveQuiz: true,
    onSetQuestions: () => undefined,
    onQuizSettingsValueChange: () => undefined,
    onSelectedQuestionIndex: () => undefined,
    onAddQuestion: () => undefined,
    onQuestionValueChange: () => undefined,
    onMoveQuestion: () => undefined,
    onDuplicateQuestionIndex: () => undefined,
    onDeleteQuestionIndex: () => undefined,
    onReplaceQuestion: () => undefined,
    onSaveQuiz: () => undefined,
    onExit: () => undefined,
  },
} satisfies Story
