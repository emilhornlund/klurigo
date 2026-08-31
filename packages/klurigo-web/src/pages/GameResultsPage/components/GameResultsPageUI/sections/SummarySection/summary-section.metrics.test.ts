import { GameMode } from '@klurigo/common'
import type {
  GameResultClassicModePlayerMetricDto,
  GameResultDto,
  GameResultParticipantDto,
  GameResultZeroToOneHundredModePlayerMetricDto,
} from '@klurigo/common'
import { describe, expect, it } from 'vitest'

import {
  getComebackRankGainMetric,
  getFastestOverallPlayerMetric,
  getLongestCorrectStreakMetric,
  getMostAccuratePlayerMetric,
  getPrecisionChampionMetric,
} from './summary-section.metrics'

const buildParticipant = (
  id: string,
  nickname: string,
): GameResultParticipantDto => ({
  id,
  nickname,
})

const buildClassicPlayerMetric = (args: {
  player: GameResultParticipantDto
  rank?: number
  comebackRankGain?: number
  unanswered?: number
  averageResponseTime: number
  longestCorrectStreak: number
  score?: number
  correct: number
  incorrect?: number
}): GameResultClassicModePlayerMetricDto => ({
  player: args.player,
  rank: args.rank ?? 1,
  comebackRankGain: args.comebackRankGain ?? 0,
  unanswered: args.unanswered ?? 0,
  averageResponseTime: args.averageResponseTime,
  longestCorrectStreak: args.longestCorrectStreak,
  score: args.score ?? 0,
  correct: args.correct,
  incorrect: args.incorrect ?? 0,
})

const buildZeroToOneHundredPlayerMetric = (args: {
  player: GameResultParticipantDto
  rank?: number
  comebackRankGain?: number
  unanswered?: number
  averageResponseTime: number
  score?: number
  averagePrecision: number
}): GameResultZeroToOneHundredModePlayerMetricDto => ({
  player: args.player,
  rank: args.rank ?? 1,
  comebackRankGain: args.comebackRankGain ?? 0,
  unanswered: args.unanswered ?? 0,
  averageResponseTime: args.averageResponseTime,
  score: args.score ?? 0,
  averagePrecision: args.averagePrecision,
})

describe('summary-section.metrics', () => {
  describe('getFastestOverallPlayerMetric', () => {
    it('returns null when there are no players', () => {
      const result = getFastestOverallPlayerMetric(
        [] as unknown as GameResultDto['playerMetrics'],
      )
      expect(result).toBeNull()
    })

    it('returns the lowest average response time and the matching player', () => {
      const alice = buildParticipant('p1', 'Alice')
      const bob = buildParticipant('p2', 'Bob')

      const playerMetrics = [
        buildClassicPlayerMetric({
          player: alice,
          averageResponseTime: 1200,
          longestCorrectStreak: 2,
          correct: 5,
        }),
        buildClassicPlayerMetric({
          player: bob,
          averageResponseTime: 900,
          longestCorrectStreak: 3,
          correct: 4,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getFastestOverallPlayerMetric(playerMetrics)

      expect(result).toEqual({
        value: 900,
        players: [bob],
      })
    })

    it('returns all tied players, sorted by nickname', () => {
      const zoe = buildParticipant('p1', 'Zoe')
      const anna = buildParticipant('p2', 'Anna')
      const bob = buildParticipant('p3', 'Bob')

      const playerMetrics = [
        buildClassicPlayerMetric({
          player: zoe,
          averageResponseTime: 700,
          longestCorrectStreak: 1,
          correct: 1,
        }),
        buildClassicPlayerMetric({
          player: anna,
          averageResponseTime: 700,
          longestCorrectStreak: 2,
          correct: 2,
        }),
        buildClassicPlayerMetric({
          player: bob,
          averageResponseTime: 900,
          longestCorrectStreak: 3,
          correct: 3,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getFastestOverallPlayerMetric(playerMetrics)

      expect(result?.value).toBe(700)
      expect(result?.players.map((p) => p.nickname)).toEqual(['Anna', 'Zoe'])
    })

    it('does not mutate the input array order', () => {
      const alice = buildParticipant('p1', 'Alice')
      const bob = buildParticipant('p2', 'Bob')

      const first = buildClassicPlayerMetric({
        player: alice,
        averageResponseTime: 1200,
        longestCorrectStreak: 2,
        correct: 5,
      })
      const second = buildClassicPlayerMetric({
        player: bob,
        averageResponseTime: 900,
        longestCorrectStreak: 3,
        correct: 4,
      })

      const playerMetrics = [
        first,
        second,
      ] as unknown as GameResultDto['playerMetrics']

      getFastestOverallPlayerMetric(playerMetrics)

      expect(playerMetrics[0]).toBe(first)
      expect(playerMetrics[1]).toBe(second)
    })
  })

  describe('getLongestCorrectStreakMetric', () => {
    it('returns null when there are no players', () => {
      const result = getLongestCorrectStreakMetric(
        [] as unknown as GameResultClassicModePlayerMetricDto[],
      )
      expect(result).toBeNull()
    })

    it('returns the highest streak and the matching player', () => {
      const alice = buildParticipant('p1', 'Alice')
      const bob = buildParticipant('p2', 'Bob')

      const playerMetrics = [
        buildClassicPlayerMetric({
          player: alice,
          averageResponseTime: 1200,
          longestCorrectStreak: 2,
          correct: 5,
        }),
        buildClassicPlayerMetric({
          player: bob,
          averageResponseTime: 900,
          longestCorrectStreak: 7,
          correct: 4,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getLongestCorrectStreakMetric(
        playerMetrics as unknown as GameResultClassicModePlayerMetricDto[],
      )

      expect(result).toEqual({
        value: 7,
        players: [bob],
      })
    })

    it('returns all tied players, sorted by nickname', () => {
      const zoe = buildParticipant('p1', 'Zoe')
      const anna = buildParticipant('p2', 'Anna')

      const playerMetrics = [
        buildClassicPlayerMetric({
          player: zoe,
          averageResponseTime: 800,
          longestCorrectStreak: 5,
          correct: 1,
        }),
        buildClassicPlayerMetric({
          player: anna,
          averageResponseTime: 900,
          longestCorrectStreak: 5,
          correct: 2,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getLongestCorrectStreakMetric(
        playerMetrics as unknown as GameResultClassicModePlayerMetricDto[],
      )

      expect(result?.value).toBe(5)
      expect(result?.players.map((p) => p.nickname)).toEqual(['Anna', 'Zoe'])
    })
  })

  describe('getMostAccuratePlayerMetric', () => {
    it('returns null when mode is not classic', () => {
      const result = getMostAccuratePlayerMetric({
        mode: GameMode.ZeroToOneHundred,
        playerMetrics: [] as unknown as GameResultDto['playerMetrics'],
        numberOfQuestions: 10,
      })
      expect(result).toBeNull()
    })

    it('returns null when there are no players', () => {
      const result = getMostAccuratePlayerMetric({
        mode: GameMode.Classic,
        playerMetrics: [] as unknown as GameResultDto['playerMetrics'],
        numberOfQuestions: 10,
      })
      expect(result).toBeNull()
    })

    it('returns null when numberOfQuestions is 0 or less', () => {
      const alice = buildParticipant('p1', 'Alice')

      const playerMetrics = [
        buildClassicPlayerMetric({
          player: alice,
          averageResponseTime: 1000,
          longestCorrectStreak: 1,
          correct: 3,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getMostAccuratePlayerMetric({
        mode: GameMode.Classic,
        playerMetrics,
        numberOfQuestions: 0,
      })

      expect(result).toBeNull()
    })

    it('returns the highest accuracy as a rounded percentage and the matching player', () => {
      const alice = buildParticipant('p1', 'Alice')
      const bob = buildParticipant('p2', 'Bob')

      const playerMetrics = [
        buildClassicPlayerMetric({
          player: alice,
          averageResponseTime: 1200,
          longestCorrectStreak: 2,
          correct: 7,
        }),
        buildClassicPlayerMetric({
          player: bob,
          averageResponseTime: 900,
          longestCorrectStreak: 3,
          correct: 8,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getMostAccuratePlayerMetric({
        mode: GameMode.Classic,
        playerMetrics,
        numberOfQuestions: 10,
      })

      expect(result).toEqual({
        value: 80,
        players: [bob],
      })
    })

    it('returns all tied players, sorted by nickname', () => {
      const zoe = buildParticipant('p1', 'Zoe')
      const anna = buildParticipant('p2', 'Anna')
      const bob = buildParticipant('p3', 'Bob')

      const playerMetrics = [
        buildClassicPlayerMetric({
          player: zoe,
          averageResponseTime: 800,
          longestCorrectStreak: 2,
          correct: 9,
        }),
        buildClassicPlayerMetric({
          player: anna,
          averageResponseTime: 900,
          longestCorrectStreak: 3,
          correct: 9,
        }),
        buildClassicPlayerMetric({
          player: bob,
          averageResponseTime: 950,
          longestCorrectStreak: 1,
          correct: 8,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getMostAccuratePlayerMetric({
        mode: GameMode.Classic,
        playerMetrics,
        numberOfQuestions: 10,
      })

      expect(result?.value).toBe(90)
      expect(result?.players.map((p) => p.nickname)).toEqual(['Anna', 'Zoe'])
    })
  })

  describe('getPrecisionChampionMetric', () => {
    it('returns null when mode is not zero-to-one-hundred', () => {
      const result = getPrecisionChampionMetric({
        mode: GameMode.Classic,
        playerMetrics: [] as unknown as GameResultDto['playerMetrics'],
      })
      expect(result).toBeNull()
    })

    it('returns null when there are no players', () => {
      const result = getPrecisionChampionMetric({
        mode: GameMode.ZeroToOneHundred,
        playerMetrics: [] as unknown as GameResultDto['playerMetrics'],
      })
      expect(result).toBeNull()
    })

    it('returns the highest precision as a rounded percentage and the matching player', () => {
      const alice = buildParticipant('p1', 'Alice')
      const bob = buildParticipant('p2', 'Bob')

      const playerMetrics = [
        buildZeroToOneHundredPlayerMetric({
          player: alice,
          averageResponseTime: 1200,
          averagePrecision: 0.84,
        }),
        buildZeroToOneHundredPlayerMetric({
          player: bob,
          averageResponseTime: 900,
          averagePrecision: 0.901,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getPrecisionChampionMetric({
        mode: GameMode.ZeroToOneHundred,
        playerMetrics,
      })

      expect(result).toEqual({
        value: 90,
        players: [bob],
      })
    })

    it('returns all tied players, sorted by nickname', () => {
      const zoe = buildParticipant('p1', 'Zoe')
      const anna = buildParticipant('p2', 'Anna')
      const bob = buildParticipant('p3', 'Bob')

      const playerMetrics = [
        buildZeroToOneHundredPlayerMetric({
          player: zoe,
          averageResponseTime: 1000,
          averagePrecision: 0.9,
        }),
        buildZeroToOneHundredPlayerMetric({
          player: anna,
          averageResponseTime: 1100,
          averagePrecision: 0.9,
        }),
        buildZeroToOneHundredPlayerMetric({
          player: bob,
          averageResponseTime: 900,
          averagePrecision: 0.89,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getPrecisionChampionMetric({
        mode: GameMode.ZeroToOneHundred,
        playerMetrics,
      })

      expect(result?.value).toBe(90)
      expect(result?.players.map((p) => p.nickname)).toEqual(['Anna', 'Zoe'])
    })
  })

  describe('getComebackRankGainMetric', () => {
    it('returns null when there are no players', () => {
      const result = getComebackRankGainMetric(
        [] as unknown as GameResultDto['playerMetrics'],
      )
      expect(result).toBeNull()
    })

    it('returns the highest comeback rank gain and the matching player', () => {
      const alice = buildParticipant('p1', 'Alice')
      const bob = buildParticipant('p2', 'Bob')

      const playerMetrics = [
        buildClassicPlayerMetric({
          player: alice,
          averageResponseTime: 1200,
          longestCorrectStreak: 2,
          correct: 5,
          comebackRankGain: 2,
        }),
        buildClassicPlayerMetric({
          player: bob,
          averageResponseTime: 900,
          longestCorrectStreak: 3,
          correct: 4,
          comebackRankGain: 5,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getComebackRankGainMetric(playerMetrics)

      expect(result).toEqual({
        value: 5,
        players: [bob],
      })
    })

    it('returns all tied players, sorted by nickname', () => {
      const zoe = buildParticipant('p1', 'Zoe')
      const anna = buildParticipant('p2', 'Anna')
      const bob = buildParticipant('p3', 'Bob')

      const playerMetrics = [
        buildClassicPlayerMetric({
          player: zoe,
          averageResponseTime: 700,
          longestCorrectStreak: 1,
          correct: 1,
          comebackRankGain: 3,
        }),
        buildClassicPlayerMetric({
          player: anna,
          averageResponseTime: 700,
          longestCorrectStreak: 2,
          correct: 2,
          comebackRankGain: 3,
        }),
        buildClassicPlayerMetric({
          player: bob,
          averageResponseTime: 900,
          longestCorrectStreak: 3,
          correct: 3,
          comebackRankGain: 1,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getComebackRankGainMetric(playerMetrics)

      expect(result?.value).toBe(3)
      expect(result?.players.map((p) => p.nickname)).toEqual(['Anna', 'Zoe'])
    })

    it('does not mutate the input array order', () => {
      const alice = buildParticipant('p1', 'Alice')
      const bob = buildParticipant('p2', 'Bob')

      const first = buildClassicPlayerMetric({
        player: alice,
        averageResponseTime: 1200,
        longestCorrectStreak: 2,
        correct: 5,
        comebackRankGain: 1,
      })
      const second = buildClassicPlayerMetric({
        player: bob,
        averageResponseTime: 900,
        longestCorrectStreak: 3,
        correct: 4,
        comebackRankGain: 2,
      })

      const playerMetrics = [
        first,
        second,
      ] as unknown as GameResultDto['playerMetrics']

      getComebackRankGainMetric(playerMetrics)

      expect(playerMetrics[0]).toBe(first)
      expect(playerMetrics[1]).toBe(second)
    })

    it('works with zero-to-one-hundred mode player metrics', () => {
      const alice = buildParticipant('p1', 'Alice')
      const bob = buildParticipant('p2', 'Bob')

      const playerMetrics = [
        buildZeroToOneHundredPlayerMetric({
          player: alice,
          averageResponseTime: 1200,
          averagePrecision: 0.84,
          comebackRankGain: 2,
        }),
        buildZeroToOneHundredPlayerMetric({
          player: bob,
          averageResponseTime: 900,
          averagePrecision: 0.901,
          comebackRankGain: 1,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getComebackRankGainMetric(playerMetrics)

      expect(result).toEqual({
        value: 2,
        players: [alice],
      })
    })
  })
})
