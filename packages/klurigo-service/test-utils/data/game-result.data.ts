import { QuestionType } from '@klurigo/common'
import { v4 as uuidv4 } from 'uuid'

import { Game } from '../../src/modules/game-core/repositories/models/schemas'
import {
  GameResult,
  PlayerMetric,
  QuestionMetric,
} from '../../src/modules/game-result/repositories/models/schemas'

import {
  MOCK_DEFAULT_PLAYER_ID,
  MOCK_DEFAULT_PLAYER_NICKNAME,
} from './game.constants'

export function createMockGameResultDocument(
  gameResult?: Partial<GameResult>,
): GameResult {
  return {
    _id: uuidv4(),
    game: { _id: uuidv4() } as Game,
    name: 'Trivia Battle',
    hostParticipantId: MOCK_DEFAULT_PLAYER_ID,
    players: [],
    questions: [],
    hosted: new Date(),
    completed: new Date(),
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
