import { GameMode, QuestionType } from '@klurigo/common'
import { v4 as uuidv4 } from 'uuid'

import {
  createMockGameDocument,
  createMockGameHostParticipantDocument,
  createMockGamePlayerParticipantDocument,
  createMockLeaderboardTaskDocument,
  createMockMultiChoiceQuestionDocument,
  createMockPinQuestionDocument,
  createMockPodiumTaskDocument,
  createMockPuzzleQuestionDocument,
  createMockQuestionResultTaskCorrectMultiChoice,
  createMockQuestionResultTaskCorrectPinAnswer,
  createMockQuestionResultTaskCorrectPuzzleAnswer,
  createMockQuestionResultTaskCorrectRange,
  createMockQuestionResultTaskCorrectTrueFalse,
  createMockQuestionResultTaskCorrectTypeAnswer,
  createMockQuestionResultTaskDocument,
  createMockQuestionResultTaskItemDocument,
  createMockQuestionTaskDocument,
  createMockQuestionTaskMultiChoiceAnswer,
  createMockQuestionTaskPinAnswer,
  createMockQuestionTaskPuzzleAnswer,
  createMockQuestionTaskRangeAnswer,
  createMockQuestionTaskTrueFalseAnswer,
  createMockQuestionTaskTypeAnswer,
  createMockRangeQuestionDocument,
  createMockTrueFalseQuestionDocument,
  createMockTypeAnswerQuestionDocument,
  MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
  MOCK_TYPE_ANSWER_OPTION_VALUE,
  offsetSeconds,
} from '../../../../test-utils/data'
import { IllegalTaskTypeException } from '../exceptions'

import {
  buildQuestionResultTask,
  rebuildQuestionResultTask,
} from './task-question-result.utils'

describe('Task Question Result Utils', () => {
  const PARTICIPANT_PLAYER_ID_01 = uuidv4()
  const PARTICIPANT_PLAYER_ID_02 = uuidv4()
  const PARTICIPANT_PLAYER_ID_03 = uuidv4()

  const createGameParticipants = (playerIds: string[]) => [
    createMockGameHostParticipantDocument(),
    ...playerIds.map((participantId) =>
      createMockGamePlayerParticipantDocument({ participantId }),
    ),
  ]

  describe('buildQuestionResultTask', () => {
    describe('Basic functionality', () => {
      it('should build a question result task item for a classic mode game when question type is multi choice', () => {
        const game = createMockGameDocument({
          participants: createGameParticipants([
            PARTICIPANT_PLAYER_ID_01,
            PARTICIPANT_PLAYER_ID_02,
            PARTICIPANT_PLAYER_ID_03,
          ]),
          questions: [createMockMultiChoiceQuestionDocument({ duration: 30 })],
          currentTask: createMockQuestionTaskDocument({
            answers: [
              createMockQuestionTaskMultiChoiceAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                created: offsetSeconds(3),
                answer: 0,
              }),
              createMockQuestionTaskMultiChoiceAnswer({
                playerId: PARTICIPANT_PLAYER_ID_02,
                created: offsetSeconds(4),
                answer: 1,
              }),
            ],
            presented: offsetSeconds(2),
            created: offsetSeconds(1),
          }),
        })

        const actual = buildQuestionResultTask(game as never)

        const expected = createMockQuestionResultTaskDocument({
          _id: expect.anything(),
          correctAnswers: [
            createMockQuestionResultTaskCorrectMultiChoice({ index: 0 }),
          ],
          results: [
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.MultiChoice,
              playerId: PARTICIPANT_PLAYER_ID_01,
              answer: createMockQuestionTaskMultiChoiceAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                answer: 0,
                created: offsetSeconds(3),
              }),
              correct: true,
              lastScore: 983,
              totalScore: 983,
              position: 1,
              streak: 1,
              lastResponseTime: 1000, // presented after 2 seconds, answered in 3 seconds, e.g 1 second response time
              totalResponseTime: 1000,
              responseCount: 1,
            }),
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.MultiChoice,
              playerId: PARTICIPANT_PLAYER_ID_02,
              answer: createMockQuestionTaskMultiChoiceAnswer({
                answer: 1,
                created: offsetSeconds(4),
                playerId: PARTICIPANT_PLAYER_ID_02,
              }),
              correct: false,
              lastScore: 0,
              totalScore: 0,
              position: 2,
              streak: 0,
              lastResponseTime: 2000, // presented after 2 seconds, answered in 4 seconds, e.g 2 seconds response time
              totalResponseTime: 2000,
              responseCount: 1,
            }),
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.MultiChoice,
              playerId: PARTICIPANT_PLAYER_ID_03,
              answer: undefined,
              correct: false,
              lastScore: 0,
              totalScore: 0,
              position: 3,
              streak: 0,
              lastResponseTime: 30000, // question duration 30 seconds
              totalResponseTime: 30000,
              responseCount: 1,
            }),
          ],
          created: expect.anything(),
        })

        expect(actual).toEqual(expected)
      })

      it('should build a question result task item for a classic mode game when question type is range', () => {
        const game = createMockGameDocument({
          participants: createGameParticipants([
            PARTICIPANT_PLAYER_ID_01,
            PARTICIPANT_PLAYER_ID_02,
            PARTICIPANT_PLAYER_ID_03,
          ]),
          questions: [createMockRangeQuestionDocument({ duration: 30 })],
          currentTask: createMockQuestionTaskDocument({
            answers: [
              createMockQuestionTaskRangeAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                created: offsetSeconds(3),
                answer: 50,
              }),
              createMockQuestionTaskRangeAnswer({
                playerId: PARTICIPANT_PLAYER_ID_02,
                created: offsetSeconds(4),
                answer: 39,
              }),
            ],
            presented: offsetSeconds(2),
            created: offsetSeconds(1),
          }),
        })

        const actual = buildQuestionResultTask(game as never)

        const expected = createMockQuestionResultTaskDocument({
          _id: expect.anything(),
          correctAnswers: [
            createMockQuestionResultTaskCorrectRange({ value: 50 }),
          ],
          results: [
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.Range,
              playerId: PARTICIPANT_PLAYER_ID_01,
              answer: createMockQuestionTaskRangeAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                answer: 50,
                created: offsetSeconds(3),
              }),
              correct: true,
              lastScore: 997,
              totalScore: 997,
              position: 1,
              streak: 1,
              lastResponseTime: 1000, // presented after 2 seconds, answered in 3 seconds, e.g 1 second response time
              totalResponseTime: 1000,
              responseCount: 1,
            }),
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.Range,
              playerId: PARTICIPANT_PLAYER_ID_02,
              answer: createMockQuestionTaskRangeAnswer({
                answer: 39,
                created: offsetSeconds(4),
                playerId: PARTICIPANT_PLAYER_ID_02,
              }),
              correct: false,
              lastScore: 0,
              totalScore: 0,
              position: 2,
              streak: 0,
              lastResponseTime: 2000, // presented after 2 seconds, answered in 4 seconds, e.g 2 seconds response time
              totalResponseTime: 2000,
              responseCount: 1,
            }),
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.Range,
              playerId: PARTICIPANT_PLAYER_ID_03,
              answer: undefined,
              correct: false,
              lastScore: 0,
              totalScore: 0,
              position: 3,
              streak: 0,
              lastResponseTime: 30000, // question duration 30 seconds
              totalResponseTime: 30000,
              responseCount: 1,
            }),
          ],
          created: expect.anything(),
        })

        expect(actual).toEqual(expected)
      })

      it('should build a question result task item for a classic mode game when question type is true false', () => {
        const game = createMockGameDocument({
          participants: createGameParticipants([
            PARTICIPANT_PLAYER_ID_01,
            PARTICIPANT_PLAYER_ID_02,
            PARTICIPANT_PLAYER_ID_03,
          ]),
          questions: [createMockTrueFalseQuestionDocument({ duration: 30 })],
          currentTask: createMockQuestionTaskDocument({
            answers: [
              createMockQuestionTaskTrueFalseAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                created: offsetSeconds(3),
                answer: false,
              }),
              createMockQuestionTaskTrueFalseAnswer({
                playerId: PARTICIPANT_PLAYER_ID_02,
                created: offsetSeconds(4),
                answer: true,
              }),
            ],
            presented: offsetSeconds(2),
            created: offsetSeconds(1),
          }),
        })

        const actual = buildQuestionResultTask(game as never)

        const expected = createMockQuestionResultTaskDocument({
          _id: expect.anything(),
          correctAnswers: [
            createMockQuestionResultTaskCorrectTrueFalse({ value: false }),
          ],
          results: [
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.TrueFalse,
              playerId: PARTICIPANT_PLAYER_ID_01,
              answer: createMockQuestionTaskTrueFalseAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                answer: false,
                created: offsetSeconds(3),
              }),
              correct: true,
              lastScore: 983,
              totalScore: 983,
              position: 1,
              streak: 1,
              lastResponseTime: 1000, // presented after 2 seconds, answered in 3 seconds, e.g 1 second response time
              totalResponseTime: 1000,
              responseCount: 1,
            }),
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.TrueFalse,
              playerId: PARTICIPANT_PLAYER_ID_02,
              answer: createMockQuestionTaskTrueFalseAnswer({
                answer: true,
                created: offsetSeconds(4),
                playerId: PARTICIPANT_PLAYER_ID_02,
              }),
              correct: false,
              lastScore: 0,
              totalScore: 0,
              position: 2,
              streak: 0,
              lastResponseTime: 2000, // presented after 2 seconds, answered in 4 seconds, e.g 2 seconds response time
              totalResponseTime: 2000,
              responseCount: 1,
            }),
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.TrueFalse,
              playerId: PARTICIPANT_PLAYER_ID_03,
              answer: undefined,
              correct: false,
              lastScore: 0,
              totalScore: 0,
              position: 3,
              streak: 0,
              lastResponseTime: 30000, // question duration 30 seconds
              totalResponseTime: 30000,
              responseCount: 1,
            }),
          ],
          created: expect.anything(),
        })

        expect(actual).toEqual(expected)
      })

      it('should build a question result task item for a classic mode game when question type is type answer', () => {
        const game = createMockGameDocument({
          participants: createGameParticipants([
            PARTICIPANT_PLAYER_ID_01,
            PARTICIPANT_PLAYER_ID_02,
            PARTICIPANT_PLAYER_ID_03,
          ]),
          questions: [createMockTypeAnswerQuestionDocument({ duration: 30 })],
          currentTask: createMockQuestionTaskDocument({
            answers: [
              createMockQuestionTaskTypeAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                created: offsetSeconds(3),
                answer: MOCK_TYPE_ANSWER_OPTION_VALUE,
              }),
              createMockQuestionTaskTypeAnswer({
                playerId: PARTICIPANT_PLAYER_ID_02,
                created: offsetSeconds(4),
                answer: MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
              }),
            ],
            presented: offsetSeconds(2),
            created: offsetSeconds(1),
          }),
        })

        const actual = buildQuestionResultTask(game as never)

        const expected = createMockQuestionResultTaskDocument({
          _id: expect.anything(),
          correctAnswers: [
            createMockQuestionResultTaskCorrectTypeAnswer({
              value: MOCK_TYPE_ANSWER_OPTION_VALUE,
            }),
          ],
          results: [
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.TypeAnswer,
              playerId: PARTICIPANT_PLAYER_ID_01,
              answer: createMockQuestionTaskTypeAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                answer: MOCK_TYPE_ANSWER_OPTION_VALUE,
                created: offsetSeconds(3),
              }),
              correct: true,
              lastScore: 983,
              totalScore: 983,
              position: 1,
              streak: 1,
              lastResponseTime: 1000, // presented after 2 seconds, answered in 3 seconds, e.g 1 second response time
              totalResponseTime: 1000,
              responseCount: 1,
            }),
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.TypeAnswer,
              playerId: PARTICIPANT_PLAYER_ID_02,
              answer: createMockQuestionTaskTypeAnswer({
                answer: MOCK_TYPE_ANSWER_INCORRECT_OPTION_VALUE,
                created: offsetSeconds(4),
                playerId: PARTICIPANT_PLAYER_ID_02,
              }),
              correct: false,
              lastScore: 0,
              totalScore: 0,
              position: 2,
              streak: 0,
              lastResponseTime: 2000, // presented after 2 seconds, answered in 4 seconds, e.g 2 seconds response time
              totalResponseTime: 2000,
              responseCount: 1,
            }),
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.TypeAnswer,
              playerId: PARTICIPANT_PLAYER_ID_03,
              answer: undefined,
              correct: false,
              lastScore: 0,
              totalScore: 0,
              position: 3,
              streak: 0,
              lastResponseTime: 30000, // question duration 30 seconds
              totalResponseTime: 30000,
              responseCount: 1,
            }),
          ],
          created: expect.anything(),
        })

        expect(actual).toEqual(expected)
      })

      it('should build a question result task item for a classic mode game when question type is pin', () => {
        const game = createMockGameDocument({
          participants: createGameParticipants([
            PARTICIPANT_PLAYER_ID_01,
            PARTICIPANT_PLAYER_ID_02,
            PARTICIPANT_PLAYER_ID_03,
          ]),
          questions: [createMockPinQuestionDocument({ duration: 30 })],
          currentTask: createMockQuestionTaskDocument({
            answers: [
              createMockQuestionTaskPinAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                created: offsetSeconds(3),
                answer: '0.5,0.5',
              }),
              createMockQuestionTaskPinAnswer({
                playerId: PARTICIPANT_PLAYER_ID_02,
                created: offsetSeconds(4),
                answer: '0.0,0.0',
              }),
            ],
            presented: offsetSeconds(2),
            created: offsetSeconds(1),
          }),
        })

        const actual = buildQuestionResultTask(game as never)

        const expected = createMockQuestionResultTaskDocument({
          _id: expect.anything(),
          correctAnswers: [
            createMockQuestionResultTaskCorrectPinAnswer({ value: '0.5,0.5' }),
          ],
          results: [
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.Pin,
              playerId: PARTICIPANT_PLAYER_ID_01,
              answer: createMockQuestionTaskPinAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                answer: '0.5,0.5',
                created: offsetSeconds(3),
              }),
              correct: true,
              lastScore: 997,
              totalScore: 997,
              position: 1,
              streak: 1,
              lastResponseTime: 1000, // presented after 2 seconds, answered in 3 seconds, e.g 1 second response time
              totalResponseTime: 1000,
              responseCount: 1,
            }),
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.Pin,
              playerId: PARTICIPANT_PLAYER_ID_02,
              answer: createMockQuestionTaskPinAnswer({
                answer: '0.0,0.0',
                created: offsetSeconds(4),
                playerId: PARTICIPANT_PLAYER_ID_02,
              }),
              correct: false,
              lastScore: 0,
              totalScore: 0,
              position: 2,
              streak: 0,
              lastResponseTime: 2000, // presented after 2 seconds, answered in 4 seconds, e.g 2 seconds response time
              totalResponseTime: 2000,
              responseCount: 1,
            }),
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.Pin,
              playerId: PARTICIPANT_PLAYER_ID_03,
              answer: undefined,
              correct: false,
              lastScore: 0,
              totalScore: 0,
              position: 3,
              streak: 0,
              lastResponseTime: 30000, // question duration 30 seconds
              totalResponseTime: 30000,
              responseCount: 1,
            }),
          ],
          created: expect.anything(),
        })

        expect(actual).toEqual(expected)
      })

      it('should build a question result task item for a classic mode game when question type is puzzle', () => {
        const game = createMockGameDocument({
          participants: createGameParticipants([
            PARTICIPANT_PLAYER_ID_01,
            PARTICIPANT_PLAYER_ID_02,
            PARTICIPANT_PLAYER_ID_03,
          ]),
          questions: [createMockPuzzleQuestionDocument({ duration: 30 })],
          currentTask: createMockQuestionTaskDocument({
            answers: [
              createMockQuestionTaskPuzzleAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                created: offsetSeconds(3),
                answer: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
              }),
              createMockQuestionTaskPuzzleAnswer({
                playerId: PARTICIPANT_PLAYER_ID_02,
                created: offsetSeconds(4),
                answer: ['Lisbon', 'Plovdiv', 'Argos', 'Athens'],
              }),
            ],
            presented: offsetSeconds(2),
            created: offsetSeconds(1),
          }),
        })

        const actual = buildQuestionResultTask(game as never)

        const expected = createMockQuestionResultTaskDocument({
          _id: expect.anything(),
          correctAnswers: [
            createMockQuestionResultTaskCorrectPuzzleAnswer({
              value: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
            }),
          ],
          results: [
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.Puzzle,
              playerId: PARTICIPANT_PLAYER_ID_01,
              answer: createMockQuestionTaskPuzzleAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                answer: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
                created: offsetSeconds(3),
              }),
              correct: true,
              lastScore: 983,
              totalScore: 983,
              position: 1,
              streak: 1,
              lastResponseTime: 1000, // presented after 2 seconds, answered in 3 seconds, e.g 1 second response time
              totalResponseTime: 1000,
              responseCount: 1,
            }),
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.Puzzle,
              playerId: PARTICIPANT_PLAYER_ID_02,
              answer: createMockQuestionTaskPuzzleAnswer({
                answer: ['Lisbon', 'Plovdiv', 'Argos', 'Athens'],
                created: offsetSeconds(4),
                playerId: PARTICIPANT_PLAYER_ID_02,
              }),
              correct: false,
              lastScore: 0,
              totalScore: 0,
              position: 2,
              streak: 0,
              lastResponseTime: 2000, // presented after 2 seconds, answered in 4 seconds, e.g 2 seconds response time
              totalResponseTime: 2000,
              responseCount: 1,
            }),
            createMockQuestionResultTaskItemDocument({
              type: QuestionType.Puzzle,
              playerId: PARTICIPANT_PLAYER_ID_03,
              answer: undefined,
              correct: false,
              lastScore: 0,
              totalScore: 0,
              position: 3,
              streak: 0,
              lastResponseTime: 30000, // question duration 30 seconds
              totalResponseTime: 30000,
              responseCount: 1,
            }),
          ],
          created: expect.anything(),
        })

        expect(actual).toEqual(expected)
      })
    })

    describe('Error Conditions', () => {
      it('throws IllegalTaskTypeException when current task is LeaderboardTask', () => {
        const game = createMockGameDocument({
          currentTask: createMockLeaderboardTaskDocument(),
        })

        expect(() => buildQuestionResultTask(game as never)).toThrow(
          IllegalTaskTypeException,
        )
      })

      it('throws IllegalTaskTypeException when current task is PodiumTask', () => {
        const game = createMockGameDocument({
          currentTask: createMockPodiumTaskDocument(),
        })

        expect(() => buildQuestionResultTask(game as never)).toThrow(
          IllegalTaskTypeException,
        )
      })

      it('throws IllegalTaskTypeException when current task is QuestionResultTask', () => {
        const game = createMockGameDocument({
          currentTask: createMockQuestionResultTaskDocument(),
        })

        expect(() => buildQuestionResultTask(game as never)).toThrow(
          IllegalTaskTypeException,
        )
      })
    })

    describe('ZeroToOneHundred Mode', () => {
      it('should build a question result task for ZeroToOneHundred mode with range question', () => {
        const game = createMockGameDocument({
          mode: GameMode.ZeroToOneHundred,
          participants: createGameParticipants([
            PARTICIPANT_PLAYER_ID_01,
            PARTICIPANT_PLAYER_ID_02,
          ]),
          questions: [createMockRangeQuestionDocument()],
          currentTask: createMockQuestionTaskDocument({
            answers: [
              createMockQuestionTaskRangeAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                created: offsetSeconds(3),
                answer: 50,
              }),
              createMockQuestionTaskRangeAnswer({
                playerId: PARTICIPANT_PLAYER_ID_02,
                created: offsetSeconds(4),
                answer: 60,
              }),
            ],
            presented: offsetSeconds(2),
          }),
        })

        const actual = buildQuestionResultTask(game as never)

        expect(actual.results).toHaveLength(2)
        expect(actual.results[0].playerId).toBe(PARTICIPANT_PLAYER_ID_01)
        expect(actual.results[0].position).toBe(1)
        expect(actual.results[0].lastScore).toBeLessThan(
          actual.results[1].lastScore,
        )
      })

      it('should assign 100 points to players with no answers in ZeroToOneHundred mode', () => {
        const game = createMockGameDocument({
          mode: GameMode.ZeroToOneHundred,
          participants: createGameParticipants([
            PARTICIPANT_PLAYER_ID_01,
            PARTICIPANT_PLAYER_ID_02,
          ]),
          questions: [createMockRangeQuestionDocument()],
          currentTask: createMockQuestionTaskDocument({
            answers: [
              createMockQuestionTaskRangeAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                created: offsetSeconds(3),
                answer: 50,
              }),
            ],
            presented: offsetSeconds(2),
          }),
        })

        const actual = buildQuestionResultTask(game as never)

        const playerWithNoAnswer = actual.results.find(
          (result) => result.playerId === PARTICIPANT_PLAYER_ID_02,
        )
        expect(playerWithNoAnswer?.lastScore).toBe(100)
        expect(playerWithNoAnswer?.position).toBe(2)
      })
    })

    describe('Edge Cases', () => {
      it('should handle empty participants array', () => {
        const game = createMockGameDocument({
          participants: [],
          questions: [createMockMultiChoiceQuestionDocument()],
          currentTask: createMockQuestionTaskDocument(),
        })

        const actual = buildQuestionResultTask(game as never)

        expect(actual.results).toEqual([])
      })

      it('should handle host-only participants', () => {
        const game = createMockGameDocument({
          participants: [createMockGameHostParticipantDocument({})],
          questions: [createMockMultiChoiceQuestionDocument()],
          currentTask: createMockQuestionTaskDocument(),
        })

        const actual = buildQuestionResultTask(game as never)

        expect(actual.results).toEqual([])
      })

      it('should handle single participant', () => {
        const game = createMockGameDocument({
          participants: createGameParticipants([PARTICIPANT_PLAYER_ID_01]),
          questions: [createMockMultiChoiceQuestionDocument()],
          currentTask: createMockQuestionTaskDocument(),
        })

        const actual = buildQuestionResultTask(game as never)

        expect(actual.results).toHaveLength(1)
        expect(actual.results[0].position).toBe(1)
      })

      it('should handle players with existing scores and streaks', () => {
        const game = createMockGameDocument({
          participants: [
            createMockGameHostParticipantDocument({}),
            createMockGamePlayerParticipantDocument({
              participantId: PARTICIPANT_PLAYER_ID_01,
              totalScore: 500,
              currentStreak: 2,
            }),
          ],
          questions: [createMockMultiChoiceQuestionDocument()],
          currentTask: createMockQuestionTaskDocument({
            answers: [
              createMockQuestionTaskMultiChoiceAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                created: offsetSeconds(3),
                answer: 0,
              }),
            ],
            presented: offsetSeconds(2),
          }),
        })

        const actual = buildQuestionResultTask(game as never)

        expect(actual.results[0].totalScore).toBe(1400)
        expect(actual.results[0].streak).toBe(3)
      })

      it('should reset streak to 0 on incorrect answers', () => {
        const game = createMockGameDocument({
          participants: [
            createMockGameHostParticipantDocument({}),
            createMockGamePlayerParticipantDocument({
              participantId: PARTICIPANT_PLAYER_ID_01,
              currentStreak: 3,
            }),
          ],
          questions: [createMockMultiChoiceQuestionDocument()],
          currentTask: createMockQuestionTaskDocument({
            answers: [
              createMockQuestionTaskMultiChoiceAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                created: offsetSeconds(3),
                answer: 1,
              }),
            ],
            presented: offsetSeconds(2),
          }),
        })

        const actual = buildQuestionResultTask(game as never)

        expect(actual.results[0].streak).toBe(0)
      })

      it('should handle multi-choice questions with multiple correct answers', () => {
        const game = createMockGameDocument({
          participants: createGameParticipants([PARTICIPANT_PLAYER_ID_01]),
          questions: [
            createMockMultiChoiceQuestionDocument({
              options: [
                { value: 'Option 1', correct: true },
                { value: 'Option 2', correct: true },
                { value: 'Option 3', correct: false },
              ],
            }),
          ],
          currentTask: createMockQuestionTaskDocument({
            answers: [
              createMockQuestionTaskMultiChoiceAnswer({
                playerId: PARTICIPANT_PLAYER_ID_01,
                created: offsetSeconds(3),
                answer: 0,
              }),
            ],
            presented: offsetSeconds(2),
          }),
        })

        const actual = buildQuestionResultTask(game as never)

        expect(actual.correctAnswers).toHaveLength(2)
        expect(actual.correctAnswers[0]).toEqual(
          expect.objectContaining({ type: QuestionType.MultiChoice, index: 0 }),
        )
        expect(actual.correctAnswers[1]).toEqual(
          expect.objectContaining({ type: QuestionType.MultiChoice, index: 1 }),
        )
      })
    })
  })

  describe('rebuildQuestionResultTask', () => {
    describe('Basic functionality', () => {
      it('should rebuild question result task for multi-choice question', () => {
        const previousTask = createMockQuestionTaskDocument({
          answers: [
            createMockQuestionTaskMultiChoiceAnswer({
              playerId: PARTICIPANT_PLAYER_ID_01,
              created: offsetSeconds(3),
              answer: 0,
            }),
          ],
          presented: offsetSeconds(2),
        })

        const currentTask = createMockQuestionResultTaskDocument({
          correctAnswers: [
            createMockQuestionResultTaskCorrectMultiChoice({ index: 0 }),
          ],
        })

        const game = createMockGameDocument({
          participants: createGameParticipants([PARTICIPANT_PLAYER_ID_01]),
          questions: [createMockMultiChoiceQuestionDocument()],
          currentTask,
          previousTasks: [previousTask],
        })

        const actual = rebuildQuestionResultTask(game as never)

        expect(actual.results).toHaveLength(1)
        expect(actual.results[0].playerId).toBe(PARTICIPANT_PLAYER_ID_01)
        expect(actual.results[0].correct).toBe(true)
        expect(actual._id).toBe(currentTask._id)
        expect(actual.correctAnswers).toEqual(currentTask.correctAnswers)
      })

      it('should rebuild question result task for range question', () => {
        const previousTask = createMockQuestionTaskDocument({
          answers: [
            createMockQuestionTaskRangeAnswer({
              playerId: PARTICIPANT_PLAYER_ID_01,
              created: offsetSeconds(3),
              answer: 50,
            }),
          ],
          presented: offsetSeconds(2),
        })

        const currentTask = createMockQuestionResultTaskDocument({
          correctAnswers: [
            createMockQuestionResultTaskCorrectRange({ value: 50 }),
          ],
        })

        const game = createMockGameDocument({
          participants: createGameParticipants([PARTICIPANT_PLAYER_ID_01]),
          questions: [createMockRangeQuestionDocument()],
          currentTask,
          previousTasks: [previousTask],
        })

        const actual = rebuildQuestionResultTask(game as never)

        expect(actual.results[0].correct).toBe(true)
      })

      it('should rebuild question result task for true-false question', () => {
        const previousTask = createMockQuestionTaskDocument({
          answers: [
            createMockQuestionTaskTrueFalseAnswer({
              playerId: PARTICIPANT_PLAYER_ID_01,
              created: offsetSeconds(3),
              answer: false,
            }),
          ],
          presented: offsetSeconds(2),
        })

        const currentTask = createMockQuestionResultTaskDocument({
          correctAnswers: [
            createMockQuestionResultTaskCorrectTrueFalse({ value: false }),
          ],
        })

        const game = createMockGameDocument({
          participants: createGameParticipants([PARTICIPANT_PLAYER_ID_01]),
          questions: [createMockTrueFalseQuestionDocument()],
          currentTask,
          previousTasks: [previousTask],
        })

        const actual = rebuildQuestionResultTask(game as never)

        expect(actual.results[0].correct).toBe(true)
      })

      it('should rebuild question result task for type-answer question', () => {
        const previousTask = createMockQuestionTaskDocument({
          answers: [
            createMockQuestionTaskTypeAnswer({
              playerId: PARTICIPANT_PLAYER_ID_01,
              created: offsetSeconds(3),
              answer: MOCK_TYPE_ANSWER_OPTION_VALUE,
            }),
          ],
          presented: offsetSeconds(2),
        })

        const currentTask = createMockQuestionResultTaskDocument({
          correctAnswers: [
            createMockQuestionResultTaskCorrectTypeAnswer({
              value: MOCK_TYPE_ANSWER_OPTION_VALUE,
            }),
          ],
        })

        const game = createMockGameDocument({
          participants: createGameParticipants([PARTICIPANT_PLAYER_ID_01]),
          questions: [createMockTypeAnswerQuestionDocument()],
          currentTask,
          previousTasks: [previousTask],
        })

        const actual = rebuildQuestionResultTask(game as never)

        expect(actual.results[0].correct).toBe(true)
      })

      it('should rebuild question result task for pin question', () => {
        const previousTask = createMockQuestionTaskDocument({
          answers: [
            createMockQuestionTaskPinAnswer({
              playerId: PARTICIPANT_PLAYER_ID_01,
              created: offsetSeconds(3),
              answer: '0.5,0.5',
            }),
          ],
          presented: offsetSeconds(2),
        })

        const currentTask = createMockQuestionResultTaskDocument({
          correctAnswers: [
            createMockQuestionResultTaskCorrectPinAnswer({ value: '0.5,0.5' }),
          ],
        })

        const game = createMockGameDocument({
          participants: createGameParticipants([PARTICIPANT_PLAYER_ID_01]),
          questions: [createMockPinQuestionDocument()],
          currentTask,
          previousTasks: [previousTask],
        })

        const actual = rebuildQuestionResultTask(game as never)

        expect(actual.results[0].correct).toBe(true)
      })

      it('should rebuild question result task for puzzle question', () => {
        const previousTask = createMockQuestionTaskDocument({
          answers: [
            createMockQuestionTaskPuzzleAnswer({
              playerId: PARTICIPANT_PLAYER_ID_01,
              created: offsetSeconds(3),
              answer: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
            }),
          ],
          presented: offsetSeconds(2),
        })

        const currentTask = createMockQuestionResultTaskDocument({
          correctAnswers: [
            createMockQuestionResultTaskCorrectPuzzleAnswer({
              value: ['Athens', 'Argos', 'Plovdiv', 'Lisbon'],
            }),
          ],
        })

        const game = createMockGameDocument({
          participants: createGameParticipants([PARTICIPANT_PLAYER_ID_01]),
          questions: [createMockPuzzleQuestionDocument()],
          currentTask,
          previousTasks: [previousTask],
        })

        const actual = rebuildQuestionResultTask(game as never)

        expect(actual.results[0].correct).toBe(true)
      })

      it('should rebuild question result task for ZeroToOneHundred mode', () => {
        const previousTask = createMockQuestionTaskDocument({
          answers: [
            createMockQuestionTaskRangeAnswer({
              playerId: PARTICIPANT_PLAYER_ID_01,
              created: offsetSeconds(3),
              answer: 50,
            }),
          ],
          presented: offsetSeconds(2),
        })

        const currentTask = createMockQuestionResultTaskDocument({
          correctAnswers: [
            createMockQuestionResultTaskCorrectRange({ value: 50 }),
          ],
        })

        const game = createMockGameDocument({
          mode: GameMode.ZeroToOneHundred,
          participants: createGameParticipants([PARTICIPANT_PLAYER_ID_01]),
          questions: [createMockRangeQuestionDocument()],
          currentTask,
          previousTasks: [previousTask],
        })

        const actual = rebuildQuestionResultTask(game as never)

        expect(actual.results[0].correct).toBe(true)
      })
    })

    describe('Error Conditions', () => {
      it('throws IllegalTaskTypeException when current task is Question', () => {
        const game = createMockGameDocument({
          currentTask: createMockQuestionTaskDocument(),
          previousTasks: [createMockQuestionTaskDocument()],
        })

        expect(() => rebuildQuestionResultTask(game as never)).toThrow(
          IllegalTaskTypeException,
        )
      })

      it('throws IllegalTaskTypeException when current task is LeaderboardTask', () => {
        const game = createMockGameDocument({
          currentTask: createMockLeaderboardTaskDocument(),
          previousTasks: [createMockQuestionTaskDocument()],
        })

        expect(() => rebuildQuestionResultTask(game as never)).toThrow(
          IllegalTaskTypeException,
        )
      })

      it('throws IllegalTaskTypeException when current task is PodiumTask', () => {
        const game = createMockGameDocument({
          currentTask: createMockPodiumTaskDocument(),
          previousTasks: [createMockQuestionTaskDocument()],
        })

        expect(() => rebuildQuestionResultTask(game as never)).toThrow(
          IllegalTaskTypeException,
        )
      })

      it('throws IllegalTaskTypeException when previous task is LeaderboardTask', () => {
        const game = createMockGameDocument({
          currentTask: createMockQuestionResultTaskDocument(),
          previousTasks: [createMockLeaderboardTaskDocument()],
        })

        expect(() => rebuildQuestionResultTask(game as never)).toThrow(
          IllegalTaskTypeException,
        )
      })

      it('throws IllegalTaskTypeException when previous task is PodiumTask', () => {
        const game = createMockGameDocument({
          currentTask: createMockQuestionResultTaskDocument(),
          previousTasks: [createMockPodiumTaskDocument()],
        })

        expect(() => rebuildQuestionResultTask(game as never)).toThrow(
          IllegalTaskTypeException,
        )
      })

      it('throws IllegalTaskTypeException when previous task is QuestionResultTask', () => {
        const game = createMockGameDocument({
          currentTask: createMockQuestionResultTaskDocument(),
          previousTasks: [createMockQuestionResultTaskDocument()],
        })

        expect(() => rebuildQuestionResultTask(game as never)).toThrow(
          IllegalTaskTypeException,
        )
      })
    })

    describe('Edge Cases', () => {
      it('throws IllegalTaskTypeException when there is no previous task', () => {
        const game = createMockGameDocument({
          currentTask: createMockQuestionResultTaskDocument(),
          previousTasks: [],
        })

        expect(() => rebuildQuestionResultTask(game as never)).toThrow(
          IllegalTaskTypeException,
        )
      })

      it('throws IllegalTaskTypeException when previousTasks is undefined', () => {
        const game = createMockGameDocument({
          currentTask: createMockQuestionResultTaskDocument(),
          previousTasks: undefined,
        })

        expect(() => rebuildQuestionResultTask(game as never)).toThrow(
          IllegalTaskTypeException,
        )
      })

      it('should handle empty correctAnswers in current task', () => {
        const previousTask = createMockQuestionTaskDocument({
          answers: [
            createMockQuestionTaskMultiChoiceAnswer({
              playerId: PARTICIPANT_PLAYER_ID_01,
              created: offsetSeconds(3),
              answer: 0,
            }),
          ],
          presented: offsetSeconds(2),
        })

        const currentTask = createMockQuestionResultTaskDocument({
          correctAnswers: [],
        })

        const game = createMockGameDocument({
          participants: createGameParticipants([PARTICIPANT_PLAYER_ID_01]),
          questions: [createMockMultiChoiceQuestionDocument()],
          currentTask,
          previousTasks: [previousTask],
        })

        const actual = rebuildQuestionResultTask(game as never)

        expect(actual.results[0].correct).toBe(false)
      })

      it('should preserve task metadata when rebuilding', () => {
        const previousTask = createMockQuestionTaskDocument({
          answers: [
            createMockQuestionTaskMultiChoiceAnswer({
              playerId: PARTICIPANT_PLAYER_ID_01,
              created: offsetSeconds(3),
              answer: 0,
            }),
          ],
          presented: offsetSeconds(2),
        })

        const currentTask = createMockQuestionResultTaskDocument({
          _id: 'test-id',
          status: 'completed',
          questionIndex: 5,
          correctAnswers: [
            createMockQuestionResultTaskCorrectMultiChoice({ index: 0 }),
          ],
        })

        const game = createMockGameDocument({
          participants: createGameParticipants([PARTICIPANT_PLAYER_ID_01]),
          questions: [createMockMultiChoiceQuestionDocument()],
          currentTask,
          previousTasks: [previousTask],
        })

        const actual = rebuildQuestionResultTask(game as never)

        expect(actual._id).toBe('test-id')
        expect(actual.status).toBe('completed')
        expect(actual.questionIndex).toBe(5)
        expect(actual.correctAnswers).toEqual(currentTask.correctAnswers)
      })
    })
  })
})
