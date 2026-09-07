import { QuestionType } from '@klurigo/common'

import {
  LeaderboardTaskItem,
  LeaderboardTaskWithBase,
  LobbyTaskWithBase,
  PodiumTaskWithBase,
  QuestionResultTaskCorrectMultiChoiceAnswerWithBase,
  QuestionResultTaskCorrectPinAnswerWithBase,
  QuestionResultTaskCorrectPuzzleAnswerWithBase,
  QuestionResultTaskCorrectRangeAnswerWithBase,
  QuestionResultTaskCorrectTrueFalseAnswerWithBase,
  QuestionResultTaskCorrectTypeAnswerWithBase,
  QuestionResultTaskItem,
  QuestionResultTaskWithBase,
  QuestionTaskBaseAnswer,
  QuestionTaskMultiChoiceAnswer,
  QuestionTaskPinAnswer,
  QuestionTaskPuzzleAnswer,
  QuestionTaskRangeAnswer,
  QuestionTaskTrueFalseAnswer,
  QuestionTaskTypeAnswerAnswer,
  QuestionTaskWithBase,
  TaskType,
} from '../../src/modules/game-core/repositories/models/schemas'

import {
  MOCK_DEFAULT_PLAYER_ID,
  MOCK_DEFAULT_PLAYER_NICKNAME,
  MOCK_TYPE_ANSWER_OPTION_VALUE,
} from './game.constants'
import { createMockUniqueId, offsetSeconds } from './helpers.utils'

export function createMockQuestionTaskDocument(
  task?: Partial<QuestionTaskWithBase>,
): QuestionTaskWithBase {
  return {
    _id: createMockUniqueId(31),
    type: TaskType.Question,
    status: 'pending',
    questionIndex: 0,
    metadata: {
      type: QuestionType.MultiChoice,
    },
    answers: [],
    presented: offsetSeconds(0),
    created: offsetSeconds(0),
    currentTransitionInitiated: offsetSeconds(0),
    currentTransitionExpires: offsetSeconds(30),
    ...(task ?? {}),
  }
}

/**
 * Creates a mock Lobby task document for tests.
 *
 * @param task - Optional overrides applied on top of the default Lobby task shape.
 * @returns A LobbyTask document with default values and any provided overrides applied.
 */
export function createMockLobbyTaskDocument(
  task?: Partial<LobbyTaskWithBase>,
): LobbyTaskWithBase {
  return {
    _id: createMockUniqueId(32),
    type: TaskType.Lobby,
    status: 'pending',
    created: offsetSeconds(0),
    ...(task ?? {}),
  }
}

export function createMockQuestionResultTaskDocument(
  task?: Partial<QuestionResultTaskWithBase>,
): QuestionResultTaskWithBase {
  return {
    _id: createMockUniqueId(33),
    type: TaskType.QuestionResult,
    status: 'pending',
    questionIndex: 0,
    correctAnswers: [],
    results: [],
    created: offsetSeconds(0),
    ...(task ?? {}),
  }
}

export function createMockQuestionResultTaskItemDocument(
  taskItem?: Partial<QuestionResultTaskItem>,
): QuestionResultTaskItem {
  return {
    type: QuestionType.MultiChoice,
    playerId: MOCK_DEFAULT_PLAYER_ID,
    nickname: MOCK_DEFAULT_PLAYER_NICKNAME,
    answer: createMockQuestionTaskMultiChoiceAnswer(),
    correct: true,
    lastScore: 1337,
    totalScore: 1337,
    position: 1,
    streak: 1,
    lastResponseTime: 0,
    totalResponseTime: 0,
    responseCount: 0,
    ...(taskItem ?? {}),
  }
}

export function createMockQuestionTaskMultiChoiceAnswer(
  answer?: Partial<QuestionTaskBaseAnswer & QuestionTaskMultiChoiceAnswer>,
): QuestionTaskBaseAnswer & QuestionTaskMultiChoiceAnswer {
  return {
    type: QuestionType.MultiChoice,
    playerId: MOCK_DEFAULT_PLAYER_ID,
    answer: 0,
    created: offsetSeconds(0),
    ...(answer ?? {}),
  }
}

export function createMockQuestionResultTaskCorrectMultiChoice(
  answer?: Partial<QuestionResultTaskCorrectMultiChoiceAnswerWithBase>,
): QuestionResultTaskCorrectMultiChoiceAnswerWithBase {
  return {
    type: QuestionType.MultiChoice,
    index: 0,
    ...(answer ?? {}),
  }
}

export function createMockQuestionTaskRangeAnswer(
  answer?: Partial<QuestionTaskBaseAnswer & QuestionTaskRangeAnswer>,
): QuestionTaskBaseAnswer & QuestionTaskRangeAnswer {
  return {
    type: QuestionType.Range,
    playerId: MOCK_DEFAULT_PLAYER_ID,
    answer: 0,
    created: offsetSeconds(0),
    ...(answer ?? {}),
  }
}

export function createMockQuestionResultTaskCorrectRange(
  answer?: Partial<QuestionResultTaskCorrectRangeAnswerWithBase>,
): QuestionResultTaskCorrectRangeAnswerWithBase {
  return {
    type: QuestionType.Range,
    value: 50,
    ...(answer ?? {}),
  }
}

export function createMockQuestionTaskTrueFalseAnswer(
  answer?: Partial<QuestionTaskBaseAnswer & QuestionTaskTrueFalseAnswer>,
): QuestionTaskBaseAnswer & QuestionTaskTrueFalseAnswer {
  return {
    type: QuestionType.TrueFalse,
    playerId: MOCK_DEFAULT_PLAYER_ID,
    answer: true,
    created: offsetSeconds(0),
    ...(answer ?? {}),
  }
}

export function createMockQuestionResultTaskCorrectTrueFalse(
  answer?: Partial<QuestionResultTaskCorrectTrueFalseAnswerWithBase>,
): QuestionResultTaskCorrectTrueFalseAnswerWithBase {
  return {
    type: QuestionType.TrueFalse,
    value: false,
    ...(answer ?? {}),
  }
}

export function createMockQuestionTaskTypeAnswer(
  answer?: Partial<QuestionTaskBaseAnswer & QuestionTaskTypeAnswerAnswer>,
): QuestionTaskBaseAnswer & QuestionTaskTypeAnswerAnswer {
  return {
    type: QuestionType.TypeAnswer,
    playerId: MOCK_DEFAULT_PLAYER_ID,
    answer: MOCK_TYPE_ANSWER_OPTION_VALUE,
    created: offsetSeconds(0),
    ...(answer ?? {}),
  }
}

export function createMockQuestionResultTaskCorrectTypeAnswer(
  answer?: Partial<QuestionResultTaskCorrectTypeAnswerWithBase>,
): QuestionResultTaskCorrectTypeAnswerWithBase {
  return {
    type: QuestionType.TypeAnswer,
    value: MOCK_TYPE_ANSWER_OPTION_VALUE,
    ...(answer ?? {}),
  }
}

export function createMockQuestionTaskPinAnswer(
  answer?: Partial<QuestionTaskBaseAnswer & QuestionTaskPinAnswer>,
): QuestionTaskBaseAnswer & QuestionTaskPinAnswer {
  return {
    type: QuestionType.Pin,
    playerId: MOCK_DEFAULT_PLAYER_ID,
    answer: '0.5,0.5',
    created: offsetSeconds(0),
    ...(answer ?? {}),
  }
}

export function createMockQuestionResultTaskCorrectPinAnswer(
  answer?: Partial<QuestionResultTaskCorrectPinAnswerWithBase>,
): QuestionResultTaskCorrectPinAnswerWithBase {
  return {
    type: QuestionType.Pin,
    value: '0.5,0.5',
    ...(answer ?? {}),
  }
}

export function createMockQuestionTaskPuzzleAnswer(
  answer?: Partial<QuestionTaskBaseAnswer & QuestionTaskPuzzleAnswer>,
): QuestionTaskBaseAnswer & QuestionTaskPuzzleAnswer {
  return {
    type: QuestionType.Puzzle,
    playerId: MOCK_DEFAULT_PLAYER_ID,
    answer: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
    created: offsetSeconds(0),
    ...(answer ?? {}),
  }
}

export function createMockQuestionResultTaskCorrectPuzzleAnswer(
  answer?: Partial<QuestionResultTaskCorrectPuzzleAnswerWithBase>,
): QuestionResultTaskCorrectPuzzleAnswerWithBase {
  return {
    type: QuestionType.Puzzle,
    value: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
    ...(answer ?? {}),
  }
}

export function createMockLeaderboardTaskItem(
  item?: Partial<LeaderboardTaskItem>,
): LeaderboardTaskItem {
  return {
    playerId: MOCK_DEFAULT_PLAYER_ID,
    position: 1,
    previousPosition: 1,
    nickname: MOCK_DEFAULT_PLAYER_NICKNAME,
    score: 1337,
    streaks: 3,
    ...(item ?? {}),
  }
}

export function createMockLeaderboardTaskDocument(
  task?: Partial<LeaderboardTaskWithBase>,
): LeaderboardTaskWithBase {
  return {
    _id: createMockUniqueId(34),
    type: TaskType.Leaderboard,
    status: 'pending',
    questionIndex: 1,
    leaderboard: [],
    created: offsetSeconds(0),
    ...(task ?? {}),
  }
}

export function createMockPodiumTaskDocument(
  task?: Partial<PodiumTaskWithBase>,
): PodiumTaskWithBase {
  return {
    _id: createMockUniqueId(35),
    type: TaskType.Podium,
    status: 'pending',
    leaderboard: [],
    created: offsetSeconds(0),
    ...(task ?? {}),
  }
}
