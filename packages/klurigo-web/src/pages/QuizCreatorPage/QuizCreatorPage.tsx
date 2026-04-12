import type {
  QuestionMultiChoiceDto,
  QuestionPinDto,
  QuestionPuzzleDto,
  QuestionRangeDto,
  QuestionTrueFalseDto,
  QuestionTypeAnswerDto,
  QuestionZeroToOneHundredRangeDto,
  QuizRequestDto,
} from '@klurigo/common'
import {
  GameMode,
  LanguageCode,
  QuestionType,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type BlockerFunction, useNavigate, useParams } from 'react-router-dom'
import { useBlocker } from 'react-router-dom'

import { useKlurigoServiceClient } from '../../api'
import { LoadingSpinner, Page } from '../../components'
import { notifyError } from '../../utils/notification'
import {
  isClassicMultiChoiceQuestion,
  isClassicPinQuestion,
  isClassicPuzzleQuestion,
  isClassicRangeQuestion,
  isClassicTrueFalseQuestion,
  isClassicTypeAnswerQuestion,
  isZeroToOneHundredRangeQuestion,
} from '../../utils/questions'

import { QuizCreatorPageUI, UnsavedChangesExitModal } from './components'
import { useQuestionDataSource } from './utils/QuestionDataSource'
import { useQuizSettingsDataSource } from './utils/QuizSettingsDataSource'

const QuizCreatorPage: FC = () => {
  const { quizId } = useParams<{ quizId: string }>()

  const navigate = useNavigate()

  const queryClient = useQueryClient()

  const { createQuiz, getQuiz, getQuizQuestions, updateQuiz } =
    useKlurigoServiceClient()

  const {
    settings: quizSettings,
    setSettings: setQuizSettings,
    settingsValidation: quizSettingsValidation,
    allSettingsValid: allQuizSettingsValid,
    updateSettingsField: onQuizSettingsValueChange,
  } = useQuizSettingsDataSource()

  const {
    gameMode,
    setGameMode,
    questions,
    setQuestions,
    questionValidations,
    allQuestionsValid,
    selectedQuestion,
    selectedQuestionIndex,
    selectQuestion,
    addQuestion,
    updateSelectedQuestionField,
    moveSelectedQuestionTo,
    duplicateQuestion,
    deleteQuestion,
    replaceQuestion,
  } = useQuestionDataSource()

  const {
    data: originalQuiz,
    isLoading: isQuizLoading,
    isError: isQuizError,
  } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => getQuiz(quizId as string),
    enabled: !!quizId,
  })

  useEffect(() => {
    if (originalQuiz && !isQuizLoading && !isQuizError) {
      setGameMode(originalQuiz.mode)
      setQuizSettings({
        title: originalQuiz.title,
        description: originalQuiz.description,
        imageCoverURL: originalQuiz.imageCoverURL,
        visibility: originalQuiz.visibility,
        category: originalQuiz.category,
        languageCode: originalQuiz.languageCode,
      })
    }
  }, [originalQuiz, isQuizLoading, isQuizError, setQuizSettings, setGameMode])

  const {
    data: originalQuizQuestions,
    isLoading: isQuizQuestionsLoading,
    isError: isQuizQuestionsError,
    isFetchedAfterMount,
  } = useQuery({
    queryKey: ['quiz_questions', quizId],
    queryFn: () => getQuizQuestions(quizId as string),
    enabled: !!quizId && !!gameMode,
    refetchOnMount: 'always',
  })

  const didHydrateQuestionsRef = useRef(false)

  useEffect(() => {
    if (!quizId) return
    if (!gameMode) return
    if (!originalQuizQuestions) return
    if (isQuizQuestionsLoading || isQuizQuestionsError) return

    // Key part: do not hydrate from old cached data
    if (!isFetchedAfterMount) return

    if (didHydrateQuestionsRef.current) return

    didHydrateQuestionsRef.current = true
    setQuestions(originalQuizQuestions)
    selectQuestion(0)
  }, [
    quizId,
    gameMode,
    originalQuizQuestions,
    isQuizQuestionsLoading,
    isQuizQuestionsError,
    isFetchedAfterMount,
    setQuestions,
    selectQuestion,
  ])

  const [isSavingQuiz, setIsSavingQuiz] = useState(false)

  type SavedQuizSnapshot = {
    gameMode: GameMode | null
    quizSettings: {
      title: string
      description: string
      imageCoverURL: string | undefined
      visibility: QuizVisibility
      category: QuizCategory
      languageCode: LanguageCode
    }
    questions: typeof questions
  }

  const [savedQuizSnapshot, setSavedQuizSnapshot] =
    useState<SavedQuizSnapshot | null>(null)

  useEffect(() => {
    if (!quizId) return
    if (!originalQuiz) return
    if (!originalQuizQuestions) return
    if (isQuizLoading || isQuizError) return
    if (isQuizQuestionsLoading || isQuizQuestionsError) return
    if (!isFetchedAfterMount) return

    setSavedQuizSnapshot({
      gameMode: originalQuiz.mode,
      quizSettings: {
        title: originalQuiz.title ?? '',
        description: originalQuiz.description ?? '',
        imageCoverURL: originalQuiz.imageCoverURL,
        visibility: originalQuiz.visibility,
        category: originalQuiz.category,
        languageCode: originalQuiz.languageCode,
      },
      questions: structuredClone(originalQuizQuestions),
    })
  }, [
    quizId,
    originalQuiz,
    originalQuizQuestions,
    isQuizLoading,
    isQuizError,
    isQuizQuestionsLoading,
    isQuizQuestionsError,
    isFetchedAfterMount,
  ])

  useEffect(() => {
    didHydrateQuestionsRef.current = false
  }, [quizId])

  const handleAddQuestion = (): void => {
    if (gameMode === GameMode.Classic) {
      addQuestion(QuestionType.MultiChoice)
    }
    if (gameMode === GameMode.ZeroToOneHundred) {
      addQuestion(QuestionType.Range)
    }
  }

  const currentQuizSettings = useMemo(
    () => ({
      title: quizSettings.title?.trim() ?? '',
      description: quizSettings.description?.trim() ?? '',
      imageCoverURL: quizSettings.imageCoverURL,
      visibility: quizSettings.visibility ?? QuizVisibility.Public,
      category: quizSettings.category ?? QuizCategory.Other,
      languageCode: quizSettings.languageCode ?? LanguageCode.English,
    }),
    [quizSettings],
  )

  const normalizedCurrentQuestions = useMemo(() => questions, [questions])

  const hasUnsavedChanges = useMemo(() => {
    if (!quizId) {
      return (
        !!gameMode ||
        currentQuizSettings.title !== '' ||
        currentQuizSettings.description !== '' ||
        !!currentQuizSettings.imageCoverURL ||
        normalizedCurrentQuestions.length > 0
      )
    }

    if (!savedQuizSnapshot) {
      return false
    }

    return (
      gameMode !== savedQuizSnapshot.gameMode ||
      JSON.stringify(savedQuizSnapshot.quizSettings) !==
        JSON.stringify(currentQuizSettings) ||
      JSON.stringify(savedQuizSnapshot.questions) !==
        JSON.stringify(normalizedCurrentQuestions)
    )
  }, [
    quizId,
    gameMode,
    currentQuizSettings,
    normalizedCurrentQuestions,
    savedQuizSnapshot,
  ])

  const shouldBlock = useCallback<BlockerFunction>(() => {
    return hasUnsavedChanges && !isSavingQuiz
  }, [hasUnsavedChanges, isSavingQuiz])

  const blocker = useBlocker(shouldBlock)

  const handleSaveQuiz = () => {
    if (isSavingQuiz || !hasUnsavedChanges) {
      return
    }

    if (!allQuizSettingsValid || !allQuestionsValid) {
      notifyError('Please fix the highlighted fields before saving')
      return
    }

    const title = quizSettings.title?.trim()
    const description = quizSettings.description?.trim() || undefined

    if (!gameMode) {
      notifyError('Game mode is required')
      return
    }

    if (!title) {
      notifyError('Title is required')
      return
    }

    const questionsToSave:
      | {
          mode: GameMode.Classic
          questions: (
            | QuestionMultiChoiceDto
            | QuestionRangeDto
            | QuestionTrueFalseDto
            | QuestionTypeAnswerDto
            | QuestionPinDto
            | QuestionPuzzleDto
          )[]
        }
      | {
          mode: GameMode.ZeroToOneHundred
          questions: QuestionZeroToOneHundredRangeDto[]
        } =
      gameMode === GameMode.Classic
        ? {
            mode: GameMode.Classic,
            questions: questions.filter(
              (question) =>
                isClassicMultiChoiceQuestion(GameMode.Classic, question) ||
                isClassicRangeQuestion(GameMode.Classic, question) ||
                isClassicTrueFalseQuestion(GameMode.Classic, question) ||
                isClassicTypeAnswerQuestion(GameMode.Classic, question) ||
                isClassicPinQuestion(GameMode.Classic, question) ||
                isClassicPuzzleQuestion(GameMode.Classic, question),
            ),
          }
        : {
            mode: GameMode.ZeroToOneHundred,
            questions: questions.filter((question) =>
              isZeroToOneHundredRangeQuestion(
                GameMode.ZeroToOneHundred,
                question,
              ),
            ),
          }

    if (questionsToSave.questions.length !== questions.length) {
      notifyError(
        'Some questions are invalid or unsupported. Please review your questions.',
      )
      return
    }

    const requestData: QuizRequestDto = {
      title,
      description,
      visibility: quizSettings.visibility ?? QuizVisibility.Public,
      category: quizSettings.category ?? QuizCategory.Other,
      imageCoverURL: quizSettings.imageCoverURL,
      languageCode: quizSettings.languageCode ?? LanguageCode.English,
      ...questionsToSave,
    }

    setIsSavingQuiz(true)

    if (quizId) {
      updateQuiz(quizId, requestData)
        .then(() => {
          setSavedQuizSnapshot({
            gameMode,
            quizSettings: currentQuizSettings,
            questions: structuredClone(normalizedCurrentQuestions),
          })
        })
        .finally(() => setIsSavingQuiz(false))
    } else {
      createQuiz(requestData)
        .then((response) => {
          navigate(`/quiz/details/${response.id}/edit`)
        })
        .finally(() => setIsSavingQuiz(false))
    }
  }

  const handleExit = () => {
    if (quizId) {
      queryClient
        .invalidateQueries({ queryKey: ['myProfileQuizzes'] })
        .then(() => navigate(`/quiz/details/${quizId}`))
    } else {
      navigate('/profile/quizzes')
    }
  }

  const handleConfirmedExit = () => {
    if (blocker.state === 'blocked') {
      blocker.proceed()
    }
  }

  if (
    quizId &&
    (isQuizLoading ||
      isQuizQuestionsLoading ||
      isQuizError ||
      isQuizQuestionsError)
  ) {
    return (
      <Page profile>
        <LoadingSpinner />
      </Page>
    )
  }

  return (
    <>
      <QuizCreatorPageUI
        gameMode={gameMode}
        onSelectGameMode={setGameMode}
        quizSettings={quizSettings}
        quizSettingsValidation={quizSettingsValidation}
        onQuizSettingsValueChange={onQuizSettingsValueChange}
        questions={questions}
        questionValidations={questionValidations}
        selectedQuestion={selectedQuestion}
        selectedQuestionIndex={selectedQuestionIndex}
        canSaveQuiz={
          allQuizSettingsValid && allQuestionsValid && hasUnsavedChanges
        }
        isSavingQuiz={isSavingQuiz}
        onSetQuestions={setQuestions}
        onSelectedQuestionIndex={selectQuestion}
        onAddQuestion={handleAddQuestion}
        onQuestionValueChange={updateSelectedQuestionField}
        onDropQuestionIndex={moveSelectedQuestionTo}
        onDuplicateQuestionIndex={duplicateQuestion}
        onDeleteQuestionIndex={deleteQuestion}
        onReplaceQuestion={replaceQuestion}
        onSaveQuiz={handleSaveQuiz}
        onExit={handleExit}
      />

      {blocker.state === 'blocked' && (
        <UnsavedChangesExitModal
          onReset={() => blocker.reset()}
          onConfirm={handleConfirmedExit}
        />
      )}
    </>
  )
}

export default QuizCreatorPage
