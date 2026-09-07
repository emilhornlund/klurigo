import { QuestionType } from '@klurigo/common'

import {
  GameResult,
  PlayerMetric,
  QuestionMetric,
} from '../../src/modules/game-result/repositories/models/schemas'

import {
  MOCK_DEFAULT_PLAYER_ID,
  MOCK_DEFAULT_PLAYER_NICKNAME,
} from './game.constants'
import { createMockGameDocument } from './game.data'
import { createMockUniqueId, offsetSeconds } from './helpers.utils'

export function createMockGameResultDocument(
  gameResult?: Partial<GameResult>,
): GameResult {
  const now = offsetSeconds(0)
  return {
    _id: createMockUniqueId(41),
    game: createMockGameDocument(),
    name: 'Trivia Battle',
    hostParticipantId: MOCK_DEFAULT_PLAYER_ID,
    players: [],
    questions: [],
    hosted: now,
    completed: now,
    ...(gameResult ?? {}),
  }
}

export function createMockGameResultPlayerMetric(
  playerMetric?: Partial<PlayerMetric>,
): PlayerMetric {
  return {
    participantId: MOCK_DEFAULT_PLAYER_ID,
    nickname: MOCK_DEFAULT_PLAYER_NICKNAME,
    rank: 0,
    comebackRankGain: 0,
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    averageResponseTime: 0,
    longestCorrectStreak: 0,
    score: 0,
    ...(playerMetric ?? {}),
  }
}

export function createMockClassicGameResultQuestionMetric(
  questionMetric?: Partial<Omit<QuestionMetric, 'averagePrecision'>>,
): QuestionMetric {
  return {
    text: 'What is capital of France?',
    type: QuestionType.MultiChoice,
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    averageResponseTime: 0,
    averagePrecision: undefined,
    ...(questionMetric ?? {}),
  }
}

export function createMockZeroToOneHundredGameResultQuestionMetric(
  questionMetric?: Partial<
    Omit<QuestionMetric, 'type' | 'correct' | 'incorrect'>
  >,
): QuestionMetric {
  return {
    text: 'Guess the temperature of the hottest day ever recorded.',
    type: QuestionType.Range,
    correct: undefined,
    incorrect: undefined,
    averagePrecision: 0,
    unanswered: 0,
    averageResponseTime: 0,
    ...(questionMetric ?? {}),
  }
}
