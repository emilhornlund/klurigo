import { QuestionType } from '@klurigo/common'
import { v4 as uuidv4 } from 'uuid'

import { QuestionResultTaskItem } from '../../game-core/repositories/models/schemas'

import {
  compareClassicModeQuestionResultTaskItemByScoreThenParticipationThenTime,
  compareClassicModeQuestionResultTaskItemByScoreThenTime,
  compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenParticipationThenTime,
  compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime,
} from './task-sorting.utils'

describe('Task Sorting Utils', () => {
  const buildItem = (
    overrides: Partial<QuestionResultTaskItem>,
  ): QuestionResultTaskItem => ({
    ...MOCK_QUESTION_RESULT_ITEM,
    playerId: `p-${uuidv4()}`,
    ...overrides,
  })

  describe('compareClassicModeQuestionResultTaskItemByScoreThenTime', () => {
    it('returns a negative value when lhs has a higher totalScore than rhs (score wins over time)', () => {
      const lhs = buildItem({ totalScore: 200, totalResponseTime: 999999 })
      const rhs = buildItem({ totalScore: 100, totalResponseTime: 1 })

      const result = compareClassicModeQuestionResultTaskItemByScoreThenTime(
        lhs,
        rhs,
      )

      expect(result).toBeLessThan(0)
    })

    it('returns a positive value when lhs has a lower totalScore than rhs (score wins over time)', () => {
      const lhs = buildItem({ totalScore: 50, totalResponseTime: 1 })
      const rhs = buildItem({ totalScore: 100, totalResponseTime: 999999 })

      const result = compareClassicModeQuestionResultTaskItemByScoreThenTime(
        lhs,
        rhs,
      )

      expect(result).toBeGreaterThan(0)
    })

    it('returns 0 when both totalScore and totalResponseTime are equal', () => {
      const lhs = buildItem({ totalScore: 100, totalResponseTime: 2000 })
      const rhs = buildItem({ totalScore: 100, totalResponseTime: 2000 })

      const result = compareClassicModeQuestionResultTaskItemByScoreThenTime(
        lhs,
        rhs,
      )

      expect(result).toBe(0)
    })

    it('returns a negative value when scores tie and lhs is faster (lower totalResponseTime)', () => {
      const lhs = buildItem({ totalScore: 100, totalResponseTime: 1000 })
      const rhs = buildItem({ totalScore: 100, totalResponseTime: 2000 })

      const result = compareClassicModeQuestionResultTaskItemByScoreThenTime(
        lhs,
        rhs,
      )

      expect(result).toBeLessThan(0)
    })

    it('returns a positive value when scores tie and lhs is slower (higher totalResponseTime)', () => {
      const lhs = buildItem({ totalScore: 100, totalResponseTime: 3000 })
      const rhs = buildItem({ totalScore: 100, totalResponseTime: 2000 })

      const result = compareClassicModeQuestionResultTaskItemByScoreThenTime(
        lhs,
        rhs,
      )

      expect(result).toBeGreaterThan(0)
    })

    it('sorts by totalScore desc, then totalResponseTime asc when scores tie', () => {
      const items: QuestionResultTaskItem[] = [
        buildItem({ playerId: 'p1', totalScore: 100, totalResponseTime: 3000 }),
        buildItem({ playerId: 'p2', totalScore: 200, totalResponseTime: 9999 }),
        buildItem({ playerId: 'p3', totalScore: 100, totalResponseTime: 1000 }),
        buildItem({ playerId: 'p4', totalScore: 0, totalResponseTime: 1 }),
      ]

      const sorted = [...items].sort(
        compareClassicModeQuestionResultTaskItemByScoreThenTime,
      )

      const ordered = sorted.map((i) => ({
        playerId: i.playerId,
        totalScore: i.totalScore,
        totalResponseTime: i.totalResponseTime,
      }))

      expect(ordered).toEqual([
        { playerId: 'p2', totalScore: 200, totalResponseTime: 9999 },
        { playerId: 'p3', totalScore: 100, totalResponseTime: 1000 },
        { playerId: 'p1', totalScore: 100, totalResponseTime: 3000 },
        { playerId: 'p4', totalScore: 0, totalResponseTime: 1 },
      ])
    })

    it('puts established zero-score players ahead of late joiners before using response time', () => {
      const established = buildItem({
        playerId: 'established',
        totalScore: 0,
        totalResponseTime: 30000,
        responseCount: 3,
      })
      const lateJoiner = buildItem({
        playerId: 'late-joiner',
        totalScore: 0,
        totalResponseTime: 10000,
        responseCount: 1,
      })

      expect(
        [lateJoiner, established].sort(
          compareClassicModeQuestionResultTaskItemByScoreThenParticipationThenTime,
        ),
      ).toEqual([established, lateJoiner])
    })
  })

  describe('compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime', () => {
    it('returns a negative value when lhs has a lower totalScore than rhs (ascending)', () => {
      const lhs = buildItem({ totalScore: 10, totalResponseTime: 999999 })
      const rhs = buildItem({ totalScore: 20, totalResponseTime: 1 })

      const result =
        compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime(
          lhs,
          rhs,
        )

      expect(result).toBeLessThan(0)
    })

    it('returns a positive value when lhs has a higher totalScore than rhs (ascending)', () => {
      const lhs = buildItem({ totalScore: 50, totalResponseTime: 1 })
      const rhs = buildItem({ totalScore: 10, totalResponseTime: 999999 })

      const result =
        compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime(
          lhs,
          rhs,
        )

      expect(result).toBeGreaterThan(0)
    })

    it('returns 0 when both totalScore and totalResponseTime are equal', () => {
      const lhs = buildItem({ totalScore: 10, totalResponseTime: 2000 })
      const rhs = buildItem({ totalScore: 10, totalResponseTime: 2000 })

      const result =
        compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime(
          lhs,
          rhs,
        )

      expect(result).toBe(0)
    })

    it('returns a negative value when scores tie and lhs is faster (lower totalResponseTime)', () => {
      const lhs = buildItem({ totalScore: 10, totalResponseTime: 1000 })
      const rhs = buildItem({ totalScore: 10, totalResponseTime: 2000 })

      const result =
        compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime(
          lhs,
          rhs,
        )

      expect(result).toBeLessThan(0)
    })

    it('returns a positive value when scores tie and lhs is slower (higher totalResponseTime)', () => {
      const lhs = buildItem({ totalScore: 10, totalResponseTime: 3000 })
      const rhs = buildItem({ totalScore: 10, totalResponseTime: 2000 })

      const result =
        compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime(
          lhs,
          rhs,
        )

      expect(result).toBeGreaterThan(0)
    })

    it('sorts by totalScore asc, then totalResponseTime asc when scores tie', () => {
      const items: QuestionResultTaskItem[] = [
        buildItem({ playerId: 'p1', totalScore: 10, totalResponseTime: 3000 }),
        buildItem({ playerId: 'p2', totalScore: 0, totalResponseTime: 9999 }),
        buildItem({ playerId: 'p3', totalScore: 10, totalResponseTime: 1000 }),
        buildItem({ playerId: 'p4', totalScore: 50, totalResponseTime: 1 }),
      ]

      const sorted = [...items].sort(
        compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenTime,
      )

      const ordered = sorted.map((i) => ({
        playerId: i.playerId,
        totalScore: i.totalScore,
        totalResponseTime: i.totalResponseTime,
      }))

      expect(ordered).toEqual([
        { playerId: 'p2', totalScore: 0, totalResponseTime: 9999 },
        { playerId: 'p3', totalScore: 10, totalResponseTime: 1000 },
        { playerId: 'p1', totalScore: 10, totalResponseTime: 3000 },
        { playerId: 'p4', totalScore: 50, totalResponseTime: 1 },
      ])
    })

    it('puts established tied-penalty players ahead of late joiners', () => {
      const established = buildItem({
        playerId: 'established',
        totalScore: 50,
        totalResponseTime: 30000,
        responseCount: 3,
      })
      const lateJoiner = buildItem({
        playerId: 'late-joiner',
        totalScore: 50,
        totalResponseTime: 10000,
        responseCount: 1,
      })

      expect(
        [lateJoiner, established].sort(
          compareZeroToOneHundredModeQuestionResultTaskItemByScoreThenParticipationThenTime,
        ),
      ).toEqual([established, lateJoiner])
    })
  })
})

const MOCK_QUESTION_RESULT_ITEM: QuestionResultTaskItem = {
  type: QuestionType.Range,
  playerId: uuidv4(),
  nickname: '',
  answer: {
    type: QuestionType.Range,
    playerId: uuidv4(),
    answer: 0,
    created: new Date(),
  },
  correct: true,
  lastScore: 0,
  totalScore: 0,
  position: 0,
  streak: 0,
  lastResponseTime: 0,
  totalResponseTime: 0,
  responseCount: 1,
}
