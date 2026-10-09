import type { GameEventQuestion, QuestionDto } from '@klurigo/common'
import { calculateRangeStep, GameMode, QuestionType } from '@klurigo/common'

import type { QuizQuestionModel } from '../../../../utils/QuestionDataSource'

const hasCommonQuestionFields = (
  question: QuizQuestionModel,
): question is QuizQuestionModel & Pick<QuestionDto, 'question' | 'duration'> =>
  typeof question.question === 'string' && typeof question.duration === 'number'

/** Converts complete editor data to the question shape consumed by player UI. */
export const toPlayerQuestion = (
  mode: GameMode,
  question: QuizQuestionModel,
): GameEventQuestion | undefined => {
  if (!hasCommonQuestionFields(question)) return undefined

  switch (question.type) {
    case QuestionType.MultiChoice:
      if (
        !Array.isArray(question.options) ||
        !question.options.every(({ value }) => typeof value === 'string')
      ) {
        return undefined
      }
      return {
        type: QuestionType.MultiChoice,
        question: question.question,
        ...(question.media ? { media: question.media } : {}),
        answers: question.options.map(({ value }) => ({ value })),
        duration: question.duration,
      }
    case QuestionType.Range: {
      const isZeroToOneHundred = mode === GameMode.ZeroToOneHundred
      const editorMin = 'min' in question ? question.min : undefined
      const editorMax = 'max' in question ? question.max : undefined
      if (
        !isZeroToOneHundred &&
        (typeof editorMin !== 'number' || typeof editorMax !== 'number')
      ) {
        return undefined
      }
      const min = isZeroToOneHundred ? 0 : editorMin
      const max = isZeroToOneHundred ? 100 : editorMax
      if (typeof min !== 'number' || typeof max !== 'number') return undefined
      return {
        type: QuestionType.Range,
        question: question.question,
        ...(question.media ? { media: question.media } : {}),
        min,
        max,
        step: isZeroToOneHundred ? 1 : calculateRangeStep(min, max),
        duration: question.duration,
      }
    }
    case QuestionType.TrueFalse:
      return {
        type: QuestionType.TrueFalse,
        question: question.question,
        ...(question.media ? { media: question.media } : {}),
        duration: question.duration,
      }
    case QuestionType.TypeAnswer:
      if (
        !Array.isArray(question.options) ||
        !question.options.every((value) => typeof value === 'string')
      ) {
        return undefined
      }
      return {
        type: QuestionType.TypeAnswer,
        question: question.question,
        ...(question.media ? { media: question.media } : {}),
        duration: question.duration,
      }
    case QuestionType.Pin:
      if (typeof question.imageURL !== 'string') return undefined
      return {
        type: QuestionType.Pin,
        question: question.question,
        imageURL: question.imageURL,
        duration: question.duration,
      }
    case QuestionType.Puzzle:
      if (
        !Array.isArray(question.values) ||
        !question.values.every((value) => typeof value === 'string')
      ) {
        return undefined
      }
      return {
        type: QuestionType.Puzzle,
        question: question.question,
        ...(question.media ? { media: question.media } : {}),
        values: [...question.values],
        duration: question.duration,
      }
    default:
      return undefined
  }
}

export const toPlayerQuestions = (
  mode: GameMode,
  questions: QuizQuestionModel[],
): GameEventQuestion[] =>
  questions.flatMap((question) => {
    const playerQuestion = toPlayerQuestion(mode, question)
    return playerQuestion ? [playerQuestion] : []
  })
