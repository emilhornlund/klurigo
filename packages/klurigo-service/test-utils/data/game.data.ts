import { GameMode, GameParticipantType, GameStatus } from '@klurigo/common'
import { v4 as uuidv4 } from 'uuid'

import {
  Game,
  ParticipantBase,
  ParticipantHost,
  ParticipantPlayer,
} from '../../src/modules/game-core/repositories/models/schemas'
import { Quiz } from '../../src/modules/quiz-core/repositories/models/schemas'

import { createMockLobbyTaskDocument } from './game-task.data'
import {
  MOCK_DEFAULT_GAME_NAME,
  MOCK_DEFAULT_PLAYER_ID,
  MOCK_DEFAULT_PLAYER_NICKNAME,
} from './game.constants'
import { offsetSeconds } from './helpers.utils'

export function createMockGameDocument(game?: Partial<Game>): Game {
  return {
    _id: uuidv4(),
    name: MOCK_DEFAULT_GAME_NAME,
    mode: GameMode.Classic,
    status: GameStatus.Active,
    pin: '123456',
    quiz: { _id: uuidv4() } as Quiz, //TODO: build mock quiz
    settings: {
      shouldAutoCompleteQuestionResultTask: false,
      shouldAutoCompleteLeaderboardTask: false,
      shouldAutoCompletePodiumTask: false,
      randomizeQuestionOrder: false,
      randomizeAnswerOrder: false,
    },
    questions: [],
    nextQuestion: 0,
    participants: [],
    currentTask: createMockLobbyTaskDocument(),
    previousTasks: [],
    updated: offsetSeconds(0),
    created: offsetSeconds(0),
    ...(game ?? {}),
  }
}

export function createMockGameHostParticipantDocument(
  participant?: Partial<ParticipantBase & ParticipantHost>,
): ParticipantBase & ParticipantHost {
  return {
    participantId: MOCK_DEFAULT_PLAYER_ID,
    type: GameParticipantType.HOST,
    updated: offsetSeconds(0),
    created: offsetSeconds(0),
    ...(participant ?? {}),
  }
}

export function createMockGamePlayerParticipantDocument(
  participant?: Partial<ParticipantBase & ParticipantPlayer>,
): ParticipantBase & ParticipantPlayer {
  return {
    participantId: MOCK_DEFAULT_PLAYER_ID,
    type: GameParticipantType.PLAYER,
    nickname: MOCK_DEFAULT_PLAYER_NICKNAME,
    rank: 0,
    worstRank: 0,
    totalScore: 0,
    currentStreak: 0,
    totalResponseTime: 0,
    responseCount: 0,
    updated: offsetSeconds(0),
    created: offsetSeconds(0),
    ...(participant ?? {}),
  }
}
