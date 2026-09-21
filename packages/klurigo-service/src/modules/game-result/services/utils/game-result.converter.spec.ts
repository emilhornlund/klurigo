import {
  GameMode,
  QuestionRangeAnswerMargin,
  QuestionType,
} from '@klurigo/common'

import {
  createMockGameDocument,
  createMockGameHostParticipantDocument,
  createMockGamePlayerParticipantDocument,
  createMockLeaderboardTaskDocument,
  createMockLeaderboardTaskItem,
  createMockLobbyTaskDocument,
  createMockMultiChoiceQuestionDocument,
  createMockPodiumTaskDocument,
  createMockQuestionResultTaskDocument,
  createMockQuestionResultTaskItemDocument,
  createMockQuestionTaskDocument,
  createMockQuestionTaskMultiChoiceAnswer,
  createMockQuestionTaskRangeAnswer,
  createMockQuestionTaskTrueFalseAnswer,
  createMockQuestionTaskTypeAnswer,
  createMockRangeQuestionDocument,
  createMockTrueFalseQuestionDocument,
  createMockTypeAnswerQuestionDocument,
  offsetSeconds,
} from '../../../../../test-utils/data'
import {
  GameDocument,
  LeaderboardTaskItem,
  QuestionResultTaskItem,
} from '../../../game-core/repositories/models/schemas'

import { buildGameResultModel } from './game-result.converter'

describe('Game Result Converter', () => {
  describe('buildGameResultModel', () => {
    it('should create a game result model for a classic mode game', () => {
      const hostId = 'ecd312eb-b732-4232-9621-d9d075d7cef1'
      const cosmicScorpionId = 'c36386fd-34c9-4a93-b282-805c026fb62e'
      const fieryBearId = 'dc74af58-f7d3-4116-9194-019674a607dc'
      const braveStallionId = '3bf8caf6-ca1b-44d2-bc8c-aaea03afb8b1'
      const hosted = offsetSeconds(1)
      const completed = offsetSeconds(180)

      const players = [
        createMockGamePlayerParticipantDocument({
          participantId: cosmicScorpionId,
          nickname: 'CosmicScorpion',
          rank: 1,
          worstRank: 2,
          totalScore: 3891,
          currentStreak: 4,
          totalResponseTime: 7844,
          responseCount: 4,
        }),
        createMockGamePlayerParticipantDocument({
          participantId: fieryBearId,
          nickname: 'FieryBear',
          rank: 2,
          worstRank: 3,
          totalScore: 2742,
          currentStreak: 2,
          totalResponseTime: 20510,
          responseCount: 4,
        }),
        createMockGamePlayerParticipantDocument({
          participantId: braveStallionId,
          nickname: 'BraveStallion',
          rank: 3,
          worstRank: 3,
          totalScore: 948,
          currentStreak: 0,
          totalResponseTime: 67999,
          responseCount: 4,
        }),
      ]

      const questions = [
        createMockMultiChoiceQuestionDocument({
          text: 'What is the capital of Sweden?',
          duration: 30,
        }),
        createMockRangeQuestionDocument({
          text: 'Guess the temperature of the hottest day ever recorded.',
          margin: QuestionRangeAnswerMargin.Medium,
          correct: 50,
          duration: 30,
        }),
        createMockTrueFalseQuestionDocument({
          text: 'The earth is flat.',
          correct: false,
          duration: 30,
        }),
        createMockTypeAnswerQuestionDocument({
          text: 'What is the capital of Denmark?',
          options: ['Copenhagen', 'Köpenhamn'],
          duration: 30,
        }),
      ]

      const question0Presented = offsetSeconds(10)
      const question1Presented = offsetSeconds(40)
      const question2Presented = offsetSeconds(70)
      const question3Presented = offsetSeconds(100)

      const questionTasks = [
        createMockQuestionTaskDocument({
          questionIndex: 0,
          presented: question0Presented,
          created: hosted,
          metadata: { type: QuestionType.MultiChoice },
          answers: [
            createMockQuestionTaskMultiChoiceAnswer({
              playerId: cosmicScorpionId,
              answer: 0,
              created: responseAt(question0Presented, 944),
            }),
            createMockQuestionTaskMultiChoiceAnswer({
              playerId: fieryBearId,
              answer: 0,
              created: responseAt(question0Presented, 2203),
            }),
            createMockQuestionTaskMultiChoiceAnswer({
              playerId: braveStallionId,
              answer: 0,
              created: responseAt(question0Presented, 3109),
            }),
          ],
        }),
        createMockQuestionTaskDocument({
          questionIndex: 1,
          presented: question1Presented,
          metadata: { type: QuestionType.Range },
          answers: [
            createMockQuestionTaskRangeAnswer({
              playerId: cosmicScorpionId,
              answer: 50,
              created: responseAt(question1Presented, 1683),
            }),
            createMockQuestionTaskRangeAnswer({
              playerId: fieryBearId,
              answer: 0,
              created: responseAt(question1Presented, 5075),
            }),
          ],
        }),
        createMockQuestionTaskDocument({
          questionIndex: 2,
          presented: question2Presented,
          metadata: { type: QuestionType.TrueFalse },
          answers: [
            createMockQuestionTaskTrueFalseAnswer({
              playerId: cosmicScorpionId,
              answer: false,
              created: responseAt(question2Presented, 1196),
            }),
            createMockQuestionTaskTrueFalseAnswer({
              playerId: fieryBearId,
              answer: false,
              created: responseAt(question2Presented, 2521),
            }),
            createMockQuestionTaskTrueFalseAnswer({
              playerId: braveStallionId,
              answer: true,
              created: responseAt(question2Presented, 4890),
            }),
          ],
        }),
        createMockQuestionTaskDocument({
          questionIndex: 3,
          presented: question3Presented,
          metadata: { type: QuestionType.TypeAnswer },
          answers: [
            createMockQuestionTaskTypeAnswer({
              playerId: cosmicScorpionId,
              answer: 'copenhagen',
              created: responseAt(question3Presented, 4021),
            }),
            createMockQuestionTaskTypeAnswer({
              playerId: fieryBearId,
              answer: 'Köpenhamn',
              created: responseAt(question3Presented, 10711),
            }),
          ],
        }),
      ]

      const questionResultTasks = [
        createMockQuestionResultTaskDocument({
          questionIndex: 0,
          results: [
            resultItem(
              QuestionType.MultiChoice,
              cosmicScorpionId,
              'CosmicScorpion',
              {
                answer: questionTasks[0].answers[0],
                correct: true,
                lastScore: 984,
                totalScore: 984,
                position: 1,
                streak: 1,
                lastResponseTime: 944,
                totalResponseTime: 944,
                responseCount: 1,
              },
            ),
            resultItem(QuestionType.MultiChoice, fieryBearId, 'FieryBear', {
              answer: questionTasks[0].answers[1],
              correct: true,
              lastScore: 963,
              totalScore: 963,
              position: 2,
              streak: 1,
              lastResponseTime: 2203,
              totalResponseTime: 2203,
              responseCount: 1,
            }),
            resultItem(
              QuestionType.MultiChoice,
              braveStallionId,
              'BraveStallion',
              {
                answer: questionTasks[0].answers[2],
                correct: true,
                lastScore: 948,
                totalScore: 948,
                position: 3,
                streak: 1,
                lastResponseTime: 3109,
                totalResponseTime: 3109,
                responseCount: 1,
              },
            ),
          ],
        }),
        createMockQuestionResultTaskDocument({
          questionIndex: 1,
          results: [
            resultItem(QuestionType.Range, cosmicScorpionId, 'CosmicScorpion', {
              answer: questionTasks[1].answers[0],
              correct: true,
              lastScore: 994,
              totalScore: 1978,
              position: 1,
              streak: 2,
              lastResponseTime: 1683,
              totalResponseTime: 2627,
              responseCount: 2,
            }),
            resultItem(QuestionType.Range, fieryBearId, 'FieryBear', {
              answer: questionTasks[1].answers[1],
              correct: false,
              lastScore: 0,
              totalScore: 963,
              position: 2,
              streak: 0,
              lastResponseTime: 5075,
              totalResponseTime: 7278,
              responseCount: 2,
            }),
            resultItem(QuestionType.Range, braveStallionId, 'BraveStallion', {
              answer: undefined,
              correct: false,
              lastScore: 0,
              totalScore: 948,
              position: 3,
              streak: 0,
              lastResponseTime: 30000,
              totalResponseTime: 33109,
              responseCount: 2,
            }),
          ],
        }),
        createMockQuestionResultTaskDocument({
          questionIndex: 2,
          results: [
            resultItem(
              QuestionType.TrueFalse,
              cosmicScorpionId,
              'CosmicScorpion',
              {
                answer: questionTasks[2].answers[0],
                correct: true,
                lastScore: 980,
                totalScore: 2958,
                position: 1,
                streak: 3,
                lastResponseTime: 1196,
                totalResponseTime: 3823,
                responseCount: 3,
              },
            ),
            resultItem(QuestionType.TrueFalse, fieryBearId, 'FieryBear', {
              answer: questionTasks[2].answers[1],
              correct: true,
              lastScore: 958,
              totalScore: 1921,
              position: 2,
              streak: 1,
              lastResponseTime: 2521,
              totalResponseTime: 9799,
              responseCount: 3,
            }),
            resultItem(
              QuestionType.TrueFalse,
              braveStallionId,
              'BraveStallion',
              {
                answer: questionTasks[2].answers[2],
                correct: false,
                lastScore: 0,
                totalScore: 948,
                position: 3,
                streak: 0,
                lastResponseTime: 4890,
                totalResponseTime: 37999,
                responseCount: 3,
              },
            ),
          ],
        }),
        createMockQuestionResultTaskDocument({
          questionIndex: 3,
          results: [
            resultItem(
              QuestionType.TypeAnswer,
              cosmicScorpionId,
              'CosmicScorpion',
              {
                answer: questionTasks[3].answers[0],
                correct: true,
                lastScore: 933,
                totalScore: 3891,
                position: 1,
                streak: 4,
                lastResponseTime: 4021,
                totalResponseTime: 7844,
                responseCount: 4,
              },
            ),
            resultItem(QuestionType.TypeAnswer, fieryBearId, 'FieryBear', {
              answer: questionTasks[3].answers[1],
              correct: true,
              lastScore: 821,
              totalScore: 2742,
              position: 2,
              streak: 2,
              lastResponseTime: 10711,
              totalResponseTime: 20510,
              responseCount: 4,
            }),
            resultItem(
              QuestionType.TypeAnswer,
              braveStallionId,
              'BraveStallion',
              {
                answer: undefined,
                correct: false,
                lastScore: 0,
                totalScore: 948,
                position: 3,
                streak: 0,
                lastResponseTime: 30000,
                totalResponseTime: 67999,
                responseCount: 4,
              },
            ),
          ],
        }),
      ]

      const leaderboardTasks = [
        createMockLeaderboardTaskDocument({
          questionIndex: 0,
          leaderboard: [
            leaderboardItem(cosmicScorpionId, 'CosmicScorpion', {
              position: 1,
              score: 984,
              streaks: 1,
            }),
            leaderboardItem(fieryBearId, 'FieryBear', {
              position: 2,
              score: 963,
              streaks: 1,
            }),
            leaderboardItem(braveStallionId, 'BraveStallion', {
              position: 3,
              score: 948,
              streaks: 1,
            }),
          ],
        }),
        createMockLeaderboardTaskDocument({
          questionIndex: 1,
          leaderboard: [
            leaderboardItem(cosmicScorpionId, 'CosmicScorpion', {
              position: 1,
              score: 1978,
              streaks: 2,
            }),
            leaderboardItem(fieryBearId, 'FieryBear', {
              position: 2,
              score: 963,
              streaks: 0,
            }),
            leaderboardItem(braveStallionId, 'BraveStallion', {
              position: 3,
              score: 948,
              streaks: 0,
            }),
          ],
        }),
        createMockLeaderboardTaskDocument({
          questionIndex: 2,
          leaderboard: [
            leaderboardItem(cosmicScorpionId, 'CosmicScorpion', {
              position: 1,
              score: 2958,
              streaks: 3,
            }),
            leaderboardItem(fieryBearId, 'FieryBear', {
              position: 2,
              score: 1921,
              streaks: 1,
            }),
            leaderboardItem(braveStallionId, 'BraveStallion', {
              position: 3,
              score: 948,
              streaks: 0,
            }),
          ],
        }),
      ]

      const gameDocument = createMockGameDocument({
        _id: '816d14d6-9945-4f8a-afbd-dc7976f6d79d',
        name: 'Classic Quiz Debug',
        mode: GameMode.Classic,
        nextQuestion: 4,
        participants: [
          createMockGameHostParticipantDocument({ participantId: hostId }),
          ...players,
        ],
        currentTask: createMockPodiumTaskDocument({
          status: 'completed',
          created: completed,
          leaderboard: [
            leaderboardItem(braveStallionId, 'BraveStallion', {
              position: 3,
              score: 948,
              streaks: 0,
            }),
            leaderboardItem(fieryBearId, 'FieryBear', {
              position: 2,
              score: 2742,
              streaks: 2,
            }),
            leaderboardItem(cosmicScorpionId, 'CosmicScorpion', {
              position: 1,
              score: 3891,
              streaks: 4,
            }),
          ],
        }),
        previousTasks: [
          createMockLobbyTaskDocument({ status: 'completed', created: hosted }),
          ...questionTasks.flatMap((questionTask, index) => [
            questionTask,
            questionResultTasks[index],
            ...(leaderboardTasks[index] ? [leaderboardTasks[index]] : []),
          ]),
        ],
        questions,
      }) as GameDocument

      const actual = buildGameResultModel(gameDocument)

      expect(actual).toEqual({
        _id: expect.anything(),
        name: gameDocument.name,
        game: gameDocument,
        hostParticipantId: hostId,
        players: [
          {
            participantId: cosmicScorpionId,
            nickname: 'CosmicScorpion',
            rank: 1,
            comebackRankGain: 1,
            correct: 4,
            incorrect: 0,
            unanswered: 0,
            averageResponseTime: 1961,
            longestCorrectStreak: 4,
            score: 3891,
          },
          {
            participantId: fieryBearId,
            nickname: 'FieryBear',
            rank: 2,
            comebackRankGain: 1,
            correct: 3,
            incorrect: 1,
            unanswered: 0,
            averageResponseTime: 5127,
            longestCorrectStreak: 2,
            score: 2742,
          },
          {
            participantId: braveStallionId,
            nickname: 'BraveStallion',
            rank: 3,
            comebackRankGain: 0,
            correct: 1,
            incorrect: 1,
            unanswered: 2,
            averageResponseTime: 16999,
            longestCorrectStreak: 1,
            score: 948,
          },
        ],
        questions: [
          {
            text: 'What is the capital of Sweden?',
            type: QuestionType.MultiChoice,
            correct: 3,
            incorrect: 0,
            unanswered: 0,
            averageResponseTime: 2085,
          },
          {
            text: 'Guess the temperature of the hottest day ever recorded.',
            type: QuestionType.Range,
            correct: 1,
            incorrect: 1,
            unanswered: 1,
            averageResponseTime: 12252,
          },
          {
            text: 'The earth is flat.',
            type: QuestionType.TrueFalse,
            correct: 2,
            incorrect: 1,
            unanswered: 0,
            averageResponseTime: 2869,
          },
          {
            text: 'What is the capital of Denmark?',
            type: QuestionType.TypeAnswer,
            correct: 2,
            incorrect: 0,
            unanswered: 1,
            averageResponseTime: 14910,
          },
        ],
        hosted,
        completed,
      })
    })

    it('should create a game result model for a zero to one hundred mode game', () => {
      const hostId = '4c5edb8a-ae4f-4294-ac59-dc5befbe5644'
      const braveBisonId = 'a145a38f-cb05-4ee5-b41a-6c4c16327321'
      const fieryBearId = 'dc74af58-f7d3-4116-9194-019674a607dc'
      const atomicBasiliskId = '84aabd9d-e067-4930-b6d2-9048f295d190'
      const hosted = offsetSeconds(201)
      const completed = offsetSeconds(350)

      const players = [
        createMockGamePlayerParticipantDocument({
          participantId: braveBisonId,
          nickname: 'BraveBison',
          rank: 1,
          worstRank: 2,
          totalScore: 70,
          currentStreak: 0,
          totalResponseTime: 66866,
          responseCount: 4,
        }),
        createMockGamePlayerParticipantDocument({
          participantId: fieryBearId,
          nickname: 'FieryBear',
          rank: 2,
          worstRank: 3,
          totalScore: 118,
          currentStreak: 0,
          totalResponseTime: 82603,
          responseCount: 4,
        }),
        createMockGamePlayerParticipantDocument({
          participantId: atomicBasiliskId,
          nickname: 'AtomicBasilisk',
          rank: 3,
          worstRank: 3,
          totalScore: 236,
          currentStreak: 0,
          totalResponseTime: 144774,
          responseCount: 4,
        }),
      ]

      const questions = [
        createMockRangeQuestionDocument({
          text: '2002 levererades den första Koenigseggbilen av modell CC8S. Hur många tillverkades totalt?',
          points: 0,
          duration: 60,
          margin: QuestionRangeAnswerMargin.None,
          correct: 6,
        }),
        createMockRangeQuestionDocument({
          text: 'Hur många år blev Kubas förre president Fidel Castro?',
          points: 0,
          duration: 60,
          margin: QuestionRangeAnswerMargin.None,
          correct: 90,
        }),
        createMockRangeQuestionDocument({
          text: 'Vilka är de två första decimalerna i talet pi?',
          points: 0,
          duration: 60,
          margin: QuestionRangeAnswerMargin.None,
          correct: 14,
        }),
        createMockRangeQuestionDocument({
          text: 'Hur många klädda kort finns det i en kortlek?',
          points: 0,
          duration: 60,
          margin: QuestionRangeAnswerMargin.None,
          correct: 12,
        }),
      ]

      const question0Presented = offsetSeconds(210)
      const question1Presented = offsetSeconds(240)
      const question2Presented = offsetSeconds(270)
      const question3Presented = offsetSeconds(300)

      const questionTasks = [
        createMockQuestionTaskDocument({
          questionIndex: 0,
          presented: question0Presented,
          created: hosted,
          metadata: { type: QuestionType.Range },
          answers: [
            createMockQuestionTaskRangeAnswer({
              playerId: braveBisonId,
              answer: 6,
              created: responseAt(question0Presented, 2290),
            }),
            createMockQuestionTaskRangeAnswer({
              playerId: fieryBearId,
              answer: 12,
              created: responseAt(question0Presented, 7253),
            }),
          ],
        }),
        createMockQuestionTaskDocument({
          questionIndex: 1,
          presented: question1Presented,
          metadata: { type: QuestionType.Range },
          answers: [
            createMockQuestionTaskRangeAnswer({
              playerId: braveBisonId,
              answer: 90,
              created: responseAt(question1Presented, 2271),
            }),
            createMockQuestionTaskRangeAnswer({
              playerId: fieryBearId,
              answer: 80,
              created: responseAt(question1Presented, 7276),
            }),
            createMockQuestionTaskRangeAnswer({
              playerId: atomicBasiliskId,
              answer: 60,
              created: responseAt(question1Presented, 12422),
            }),
          ],
        }),
        createMockQuestionTaskDocument({
          questionIndex: 2,
          presented: question2Presented,
          metadata: { type: QuestionType.Range },
          answers: [
            createMockQuestionTaskRangeAnswer({
              playerId: braveBisonId,
              answer: 14,
              created: responseAt(question2Presented, 2305),
            }),
            createMockQuestionTaskRangeAnswer({
              playerId: fieryBearId,
              answer: 12,
              created: responseAt(question2Presented, 8074),
            }),
            createMockQuestionTaskRangeAnswer({
              playerId: atomicBasiliskId,
              answer: 20,
              created: responseAt(question2Presented, 12352),
            }),
          ],
        }),
        createMockQuestionTaskDocument({
          questionIndex: 3,
          presented: question3Presented,
          metadata: { type: QuestionType.Range },
          answers: [],
        }),
      ]

      const questionResultTasks = [
        createMockQuestionResultTaskDocument({
          questionIndex: 0,
          results: [
            resultItem(QuestionType.Range, braveBisonId, 'BraveBison', {
              answer: questionTasks[0].answers[0],
              correct: true,
              lastScore: -10,
              totalScore: -10,
              position: 1,
              streak: 1,
              lastResponseTime: 2290,
              totalResponseTime: 2290,
              responseCount: 1,
            }),
            resultItem(QuestionType.Range, fieryBearId, 'FieryBear', {
              answer: questionTasks[0].answers[1],
              correct: false,
              lastScore: 6,
              totalScore: 6,
              position: 2,
              streak: 0,
              lastResponseTime: 7253,
              totalResponseTime: 7253,
              responseCount: 1,
            }),
            resultItem(QuestionType.Range, atomicBasiliskId, 'AtomicBasilisk', {
              answer: undefined,
              correct: false,
              lastScore: 100,
              totalScore: 100,
              position: 3,
              streak: 0,
              lastResponseTime: 60000,
              totalResponseTime: 60000,
              responseCount: 1,
            }),
          ],
        }),
        createMockQuestionResultTaskDocument({
          questionIndex: 1,
          results: [
            resultItem(QuestionType.Range, braveBisonId, 'BraveBison', {
              answer: questionTasks[1].answers[0],
              correct: true,
              lastScore: -10,
              totalScore: -20,
              position: 1,
              streak: 2,
              lastResponseTime: 2271,
              totalResponseTime: 4561,
              responseCount: 2,
            }),
            resultItem(QuestionType.Range, fieryBearId, 'FieryBear', {
              answer: questionTasks[1].answers[1],
              correct: false,
              lastScore: 10,
              totalScore: 16,
              position: 2,
              streak: 0,
              lastResponseTime: 7276,
              totalResponseTime: 14529,
              responseCount: 2,
            }),
            resultItem(QuestionType.Range, atomicBasiliskId, 'AtomicBasilisk', {
              answer: questionTasks[1].answers[2],
              correct: false,
              lastScore: 30,
              totalScore: 130,
              position: 3,
              streak: 0,
              lastResponseTime: 12422,
              totalResponseTime: 72422,
              responseCount: 2,
            }),
          ],
        }),
        createMockQuestionResultTaskDocument({
          questionIndex: 2,
          results: [
            resultItem(QuestionType.Range, braveBisonId, 'BraveBison', {
              answer: questionTasks[2].answers[0],
              correct: true,
              lastScore: -10,
              totalScore: -30,
              position: 1,
              streak: 3,
              lastResponseTime: 2305,
              totalResponseTime: 6866,
              responseCount: 3,
            }),
            resultItem(QuestionType.Range, fieryBearId, 'FieryBear', {
              answer: questionTasks[2].answers[1],
              correct: false,
              lastScore: 2,
              totalScore: 18,
              position: 2,
              streak: 0,
              lastResponseTime: 8074,
              totalResponseTime: 22603,
              responseCount: 3,
            }),
            resultItem(QuestionType.Range, atomicBasiliskId, 'AtomicBasilisk', {
              answer: questionTasks[2].answers[2],
              correct: false,
              lastScore: 6,
              totalScore: 136,
              position: 3,
              streak: 0,
              lastResponseTime: 12352,
              totalResponseTime: 84774,
              responseCount: 3,
            }),
          ],
        }),
        createMockQuestionResultTaskDocument({
          questionIndex: 3,
          results: [
            resultItem(QuestionType.Range, braveBisonId, 'BraveBison', {
              answer: undefined,
              correct: false,
              lastScore: 100,
              totalScore: 70,
              position: 1,
              streak: 0,
              lastResponseTime: 60000,
              totalResponseTime: 66866,
              responseCount: 4,
            }),
            resultItem(QuestionType.Range, fieryBearId, 'FieryBear', {
              answer: undefined,
              correct: false,
              lastScore: 100,
              totalScore: 118,
              position: 2,
              streak: 0,
              lastResponseTime: 60000,
              totalResponseTime: 82603,
              responseCount: 4,
            }),
            resultItem(QuestionType.Range, atomicBasiliskId, 'AtomicBasilisk', {
              answer: undefined,
              correct: false,
              lastScore: 100,
              totalScore: 236,
              position: 3,
              streak: 0,
              lastResponseTime: 60000,
              totalResponseTime: 144774,
              responseCount: 4,
            }),
          ],
        }),
      ]

      const leaderboardTasks = [
        createMockLeaderboardTaskDocument({
          questionIndex: 0,
          leaderboard: [
            leaderboardItem(braveBisonId, 'BraveBison', {
              position: 1,
              score: -10,
              streaks: 1,
            }),
            leaderboardItem(fieryBearId, 'FieryBear', {
              position: 2,
              score: 6,
              streaks: 0,
            }),
            leaderboardItem(atomicBasiliskId, 'AtomicBasilisk', {
              position: 3,
              score: 100,
              streaks: 0,
            }),
          ],
        }),
        createMockLeaderboardTaskDocument({
          questionIndex: 1,
          leaderboard: [
            leaderboardItem(braveBisonId, 'BraveBison', {
              position: 1,
              score: -20,
              streaks: 2,
            }),
            leaderboardItem(fieryBearId, 'FieryBear', {
              position: 2,
              score: 16,
              streaks: 0,
            }),
            leaderboardItem(atomicBasiliskId, 'AtomicBasilisk', {
              position: 3,
              score: 130,
              streaks: 0,
            }),
          ],
        }),
        createMockLeaderboardTaskDocument({
          questionIndex: 2,
          leaderboard: [
            leaderboardItem(braveBisonId, 'BraveBison', {
              position: 1,
              score: -30,
              streaks: 3,
            }),
            leaderboardItem(fieryBearId, 'FieryBear', {
              position: 2,
              score: 18,
              streaks: 0,
            }),
            leaderboardItem(atomicBasiliskId, 'AtomicBasilisk', {
              position: 3,
              score: 136,
              streaks: 0,
            }),
          ],
        }),
      ]

      const gameDocument = createMockGameDocument({
        _id: '154b2fa4-6d7f-434f-b99a-c5bbc825fc1b',
        name: '0-100 Quiz Debug',
        mode: GameMode.ZeroToOneHundred,
        nextQuestion: 4,
        participants: [
          createMockGameHostParticipantDocument({ participantId: hostId }),
          ...players,
        ],
        currentTask: createMockPodiumTaskDocument({
          status: 'completed',
          created: completed,
          leaderboard: [
            leaderboardItem(atomicBasiliskId, 'AtomicBasilisk', {
              position: 3,
              score: 236,
              streaks: 0,
            }),
            leaderboardItem(fieryBearId, 'FieryBear', {
              position: 2,
              score: 118,
              streaks: 0,
            }),
            leaderboardItem(braveBisonId, 'BraveBison', {
              position: 1,
              score: 70,
              streaks: 0,
            }),
          ],
        }),
        previousTasks: [
          createMockLobbyTaskDocument({ status: 'completed', created: hosted }),
          ...questionTasks.flatMap((questionTask, index) => [
            questionTask,
            questionResultTasks[index],
            ...(leaderboardTasks[index] ? [leaderboardTasks[index]] : []),
          ]),
        ],
        questions,
      }) as GameDocument

      const actual = buildGameResultModel(gameDocument)

      expect(actual).toEqual({
        _id: expect.anything(),
        name: gameDocument.name,
        game: gameDocument,
        hostParticipantId: hostId,
        players: [
          {
            nickname: 'BraveBison',
            participantId: braveBisonId,
            rank: 1,
            comebackRankGain: 1,
            averagePrecision: 0.75,
            unanswered: 1,
            averageResponseTime: 16716,
            score: 70,
          },
          {
            nickname: 'FieryBear',
            participantId: fieryBearId,
            rank: 2,
            comebackRankGain: 1,
            averagePrecision: 0.7,
            unanswered: 1,
            averageResponseTime: 20650,
            score: 118,
          },
          {
            nickname: 'AtomicBasilisk',
            participantId: atomicBasiliskId,
            rank: 3,
            comebackRankGain: 0,
            averagePrecision: 0.41,
            unanswered: 2,
            averageResponseTime: 36193,
            score: 236,
          },
        ],
        questions: [
          {
            text: '2002 levererades den första Koenigseggbilen av modell CC8S. Hur många tillverkades totalt?',
            type: QuestionType.Range,
            averagePrecision: 0.65,
            unanswered: 1,
            averageResponseTime: 23181,
          },
          {
            text: 'Hur många år blev Kubas förre president Fidel Castro?',
            type: QuestionType.Range,
            averagePrecision: 0.87,
            unanswered: 0,
            averageResponseTime: 7323,
          },
          {
            text: 'Vilka är de två första decimalerna i talet pi?',
            type: QuestionType.Range,
            averagePrecision: 0.97,
            unanswered: 0,
            averageResponseTime: 7577,
          },
          {
            text: 'Hur många klädda kort finns det i en kortlek?',
            type: QuestionType.Range,
            averagePrecision: 0,
            unanswered: 3,
            averageResponseTime: 60000,
          },
        ],
        hosted,
        completed,
      })
    })

    it('does not produce a negative unanswered count when a player leaves after answering', () => {
      const presented = offsetSeconds(400)
      const hostId = 'host-1'
      const remainingPlayerId = 'remaining-player'
      const removedPlayerId = 'removed-player'

      const gameDocument = createMockGameDocument({
        _id: 'game-with-leaver',
        name: 'Game with leaver',
        mode: GameMode.Classic,
        questions: [
          createMockMultiChoiceQuestionDocument({
            text: 'Question',
            options: [{ value: 'Correct', correct: true }],
          }),
        ],
        participants: [
          createMockGameHostParticipantDocument({
            participantId: hostId,
            created: presented,
            updated: presented,
          }),
          createMockGamePlayerParticipantDocument({
            participantId: remainingPlayerId,
            nickname: 'Remaining',
            rank: 1,
            worstRank: 1,
            totalScore: 900,
            currentStreak: 1,
            totalResponseTime: 1000,
            responseCount: 1,
            created: presented,
            updated: presented,
          }),
        ],
        currentTask: createMockPodiumTaskDocument({
          status: 'completed',
          created: offsetSeconds(410),
          leaderboard: [
            leaderboardItem(remainingPlayerId, 'Remaining', {
              score: 900,
              streaks: 1,
            }),
          ],
        }),
        previousTasks: [
          createMockQuestionTaskDocument({
            questionIndex: 0,
            presented,
            created: presented,
            answers: [
              createMockQuestionTaskMultiChoiceAnswer({
                playerId: remainingPlayerId,
                answer: 0,
                created: responseAt(presented, 1000),
              }),
              createMockQuestionTaskMultiChoiceAnswer({
                playerId: removedPlayerId,
                answer: 0,
                created: responseAt(presented, 2000),
              }),
            ],
          }),
          createMockQuestionResultTaskDocument({
            questionIndex: 0,
            results: [
              resultItem(
                QuestionType.MultiChoice,
                remainingPlayerId,
                'Remaining',
                {
                  answer: createMockQuestionTaskMultiChoiceAnswer({
                    playerId: remainingPlayerId,
                    answer: 0,
                    created: responseAt(presented, 1000),
                  }),
                  correct: true,
                  lastScore: 900,
                  totalScore: 900,
                  position: 1,
                  streak: 1,
                  lastResponseTime: 1000,
                  totalResponseTime: 1000,
                  responseCount: 1,
                },
              ),
            ],
          }),
        ],
      }) as GameDocument

      const result = buildGameResultModel(gameDocument)

      expect(result.questions[0].averageResponseTime).toBe(1500)
      expect(result.questions[0].unanswered).toBe(0)
    })
  })
})

function responseAt(presented: Date, responseTime: number): Date {
  return new Date(presented.getTime() + responseTime)
}

function resultItem(
  type: QuestionType,
  playerId: string,
  nickname: string,
  overrides: Partial<QuestionResultTaskItem>,
): QuestionResultTaskItem {
  return createMockQuestionResultTaskItemDocument({
    type,
    playerId,
    nickname,
    ...overrides,
  })
}

function leaderboardItem(
  playerId: string,
  nickname: string,
  overrides: Partial<LeaderboardTaskItem>,
): LeaderboardTaskItem {
  return createMockLeaderboardTaskItem({
    playerId,
    nickname,
    ...overrides,
  })
}
