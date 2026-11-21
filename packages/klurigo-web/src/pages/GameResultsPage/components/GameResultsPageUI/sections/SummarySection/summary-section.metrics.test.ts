import { DEFAULT_CRITTERS_AVATAR_V1, GameMode } from '@klurigo/common'
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
  avatar: DEFAULT_CRITTERS_AVATAR_V1,
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
  const player = buildParticipant('p1', 'Alice')
  const classic = buildClassicPlayerMetric({
    player,
    averageResponseTime: 1000,
    longestCorrectStreak: 2,
    correct: 2,
    comebackRankGain: 1,
  })
  const zeroToOneHundred = buildZeroToOneHundredPlayerMetric({
    player,
    averageResponseTime: 1000,
    averagePrecision: 0.5,
  })
  const classicArgs = { mode: GameMode.Classic, numberOfQuestions: 10 }
  const z2hArgs = { mode: GameMode.ZeroToOneHundred, numberOfQuestions: 10 }

  it('omits answer-based awards when nobody submits an answer in either mode', () => {
    const unansweredClassic = {
      ...classicArgs,
      playerMetrics: [{ ...classic, correct: 0, unanswered: 10 }],
    }
    const unansweredZ2h = {
      ...z2hArgs,
      playerMetrics: [{ ...zeroToOneHundred, unanswered: 10 }],
    }

    expect(getFastestOverallPlayerMetric(unansweredClassic)).toBeNull()
    expect(getMostAccuratePlayerMetric(unansweredClassic)).toBeNull()
    expect(getFastestOverallPlayerMetric(unansweredZ2h)).toBeNull()
    expect(getPrecisionChampionMetric(unansweredZ2h)).toBeNull()
  })

  it.each([undefined, null, NaN, Infinity, -Infinity])(
    'ignores invalid award values (%s) without hiding valid winners',
    (invalid) => {
      const value = invalid as number
      const invalidClassic = {
        ...classic,
        player: buildParticipant('p2', 'Bob'),
        averageResponseTime: value,
        longestCorrectStreak: value,
        comebackRankGain: value,
        correct: value,
      }
      const invalidTiming = { ...invalidClassic, correct: classic.correct }
      const invalidZ2h = {
        ...zeroToOneHundred,
        player: invalidClassic.player,
        averagePrecision: value,
      }

      expect(getComebackRankGainMetric([invalidClassic, classic])).toEqual({
        value: 1,
        players: [player],
      })
      expect(getLongestCorrectStreakMetric([invalidClassic, classic])).toEqual({
        value: 2,
        players: [player],
      })
      expect(
        getFastestOverallPlayerMetric({
          ...classicArgs,
          playerMetrics: [invalidTiming, classic],
        }),
      ).toEqual({ value: 1000, players: [player] })
      expect(
        getMostAccuratePlayerMetric({
          ...classicArgs,
          playerMetrics: [invalidClassic, classic],
        }),
      ).toEqual({ value: 20, players: [player] })
      expect(
        getPrecisionChampionMetric({
          ...z2hArgs,
          playerMetrics: [invalidZ2h, zeroToOneHundred],
        }),
      ).toEqual({ value: 50, players: [player] })
    },
  )

  it('does not infer submissions from missing or non-finite answer counts', () => {
    const invalidClassic = {
      ...classicArgs,
      playerMetrics: [
        { ...classic, incorrect: undefined as unknown as number },
      ],
    }
    const invalidZ2h = {
      ...z2hArgs,
      playerMetrics: [{ ...zeroToOneHundred, unanswered: -Infinity }],
    }

    expect(getFastestOverallPlayerMetric(invalidClassic)).toBeNull()
    expect(getMostAccuratePlayerMetric(invalidClassic)).toBeNull()
    expect(getFastestOverallPlayerMetric(invalidZ2h)).toBeNull()
    expect(getPrecisionChampionMetric(invalidZ2h)).toBeNull()
  })

  describe('getFastestOverallPlayerMetric', () => {
    it('returns null when there are no players', () => {
      const result = getFastestOverallPlayerMetric({
        mode: GameMode.Classic,
        playerMetrics: [],
        numberOfQuestions: 10,
      })
      expect(result).toBeNull()
    })

    it('returns the lowest unrounded average response time and the matching player', () => {
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
          averageResponseTime: 1199,
          longestCorrectStreak: 3,
          correct: 4,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getFastestOverallPlayerMetric({
        mode: GameMode.Classic,
        playerMetrics,
        numberOfQuestions: 10,
      })

      expect(result).toEqual({
        value: 1199,
        players: [bob],
      })
    })

    it('returns all eligible players tied at 0 ms, sorted by nickname', () => {
      const zoe = buildParticipant('p1', 'Zoe')
      const anna = buildParticipant('p2', 'Anna')
      const bob = buildParticipant('p3', 'Bob')

      const playerMetrics = [
        buildClassicPlayerMetric({
          player: zoe,
          averageResponseTime: 0,
          longestCorrectStreak: 0,
          correct: 0,
          incorrect: 1,
          unanswered: 9,
        }),
        buildClassicPlayerMetric({
          player: anna,
          averageResponseTime: 0,
          longestCorrectStreak: 2,
          correct: 2,
        }),
        buildClassicPlayerMetric({
          player: bob,
          averageResponseTime: 0,
          longestCorrectStreak: 0,
          correct: 0,
          unanswered: 10,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getFastestOverallPlayerMetric({
        mode: GameMode.Classic,
        playerMetrics,
        numberOfQuestions: 10,
      })

      expect(result?.value).toBe(0)
      expect(result?.players.map((p) => p.nickname)).toEqual(['Anna', 'Zoe'])
    })

    it('excludes Zero to One Hundred players who skipped every question', () => {
      const skipped = buildZeroToOneHundredPlayerMetric({
        player: buildParticipant('p1', 'Alice'),
        averageResponseTime: 0,
        averagePrecision: 0,
        unanswered: 10,
      })
      const answered = buildZeroToOneHundredPlayerMetric({
        player: buildParticipant('p2', 'Bob'),
        averageResponseTime: 1900,
        averagePrecision: 0,
        unanswered: 9,
      })

      expect(
        getFastestOverallPlayerMetric({
          mode: GameMode.ZeroToOneHundred,
          playerMetrics: [skipped, answered],
          numberOfQuestions: 10,
        }),
      ).toEqual({ value: 1900, players: [answered.player] })
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

      getFastestOverallPlayerMetric({
        mode: GameMode.Classic,
        playerMetrics,
        numberOfQuestions: 10,
      })

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

    it('returns null when the longest streak is one', () => {
      const playerMetrics = [0, 1].map((streak) =>
        buildClassicPlayerMetric({
          player: buildParticipant(`p${streak}`, `Player ${streak}`),
          averageResponseTime: 1000,
          longestCorrectStreak: streak,
          correct: streak,
        }),
      )

      expect(getLongestCorrectStreakMetric(playerMetrics)).toBeNull()
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
          longestCorrectStreak: 2,
          correct: 2,
        }),
        buildClassicPlayerMetric({
          player: anna,
          averageResponseTime: 900,
          longestCorrectStreak: 2,
          correct: 2,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getLongestCorrectStreakMetric(
        playerMetrics as unknown as GameResultClassicModePlayerMetricDto[],
      )

      expect(result?.value).toBe(2)
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

    it.each([0, -1, Infinity, NaN])(
      'returns null when numberOfQuestions is %s',
      (numberOfQuestions) => {
        const result = getMostAccuratePlayerMetric({
          mode: GameMode.Classic,
          playerMetrics: [classic],
          numberOfQuestions,
        })

        expect(result).toBeNull()
      },
    )

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

    it('returns all players tied before rounding, sorted by nickname', () => {
      const zoe = buildParticipant('p1', 'Zoe')
      const anna = buildParticipant('p2', 'Anna')
      const bob = buildParticipant('p3', 'Bob')

      const playerMetrics = [
        buildClassicPlayerMetric({
          player: zoe,
          averageResponseTime: 800,
          longestCorrectStreak: 2,
          correct: 200,
        }),
        buildClassicPlayerMetric({
          player: anna,
          averageResponseTime: 900,
          longestCorrectStreak: 3,
          correct: 200,
        }),
        buildClassicPlayerMetric({
          player: bob,
          averageResponseTime: 950,
          longestCorrectStreak: 1,
          correct: 199,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getMostAccuratePlayerMetric({
        mode: GameMode.Classic,
        playerMetrics,
        numberOfQuestions: 1000,
      })

      expect(result?.value).toBe(20)
      expect(result?.players.map((p) => p.nickname)).toEqual(['Anna', 'Zoe'])
    })

    it('returns null when submitted answers were all incorrect', () => {
      const answered = buildClassicPlayerMetric({
        player: buildParticipant('p1', 'Alice'),
        averageResponseTime: 1000,
        longestCorrectStreak: 0,
        correct: 0,
        incorrect: 1,
        unanswered: 9,
      })

      expect(
        getMostAccuratePlayerMetric({
          mode: GameMode.Classic,
          playerMetrics: [answered],
          numberOfQuestions: 10,
        }),
      ).toBeNull()
    })
  })

  describe('getPrecisionChampionMetric', () => {
    it('returns null when mode is not zero-to-one-hundred', () => {
      const result = getPrecisionChampionMetric({
        mode: GameMode.Classic,
        playerMetrics: [] as unknown as GameResultDto['playerMetrics'],
        numberOfQuestions: 10,
      })
      expect(result).toBeNull()
    })

    it('returns null when there are no players', () => {
      const result = getPrecisionChampionMetric({
        mode: GameMode.ZeroToOneHundred,
        playerMetrics: [] as unknown as GameResultDto['playerMetrics'],
        numberOfQuestions: 10,
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
        numberOfQuestions: 10,
      })

      expect(result).toEqual({
        value: 90,
        players: [bob],
      })
    })

    it('returns all eligible players tied before rounding, sorted by nickname', () => {
      const zoe = buildParticipant('p1', 'Zoe')
      const anna = buildParticipant('p2', 'Anna')
      const bob = buildParticipant('p3', 'Bob')
      const alice = buildParticipant('p4', 'Alice')

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
          averagePrecision: 0.899,
        }),
        buildZeroToOneHundredPlayerMetric({
          player: alice,
          averageResponseTime: 0,
          averagePrecision: 1,
          unanswered: 10,
        }),
      ] as unknown as GameResultDto['playerMetrics']

      const result = getPrecisionChampionMetric({
        mode: GameMode.ZeroToOneHundred,
        playerMetrics,
        numberOfQuestions: 10,
      })

      expect(result?.value).toBe(90)
      expect(result?.players.map((p) => p.nickname)).toEqual(['Anna', 'Zoe'])
    })

    it('returns null when submitted answers have zero precision', () => {
      const answered = buildZeroToOneHundredPlayerMetric({
        player: buildParticipant('p1', 'Alice'),
        averageResponseTime: 1000,
        averagePrecision: 0,
        unanswered: 9,
      })

      expect(
        getPrecisionChampionMetric({
          mode: GameMode.ZeroToOneHundred,
          playerMetrics: [answered],
          numberOfQuestions: 10,
        }),
      ).toBeNull()
    })
  })

  describe('getComebackRankGainMetric', () => {
    it('returns null when there are no players', () => {
      const result = getComebackRankGainMetric(
        [] as unknown as GameResultDto['playerMetrics'],
      )
      expect(result).toBeNull()
    })

    it('returns null when every comeback value is zero', () => {
      const playerMetrics = ['Alice', 'Bob'].map((nickname) =>
        buildClassicPlayerMetric({
          player: buildParticipant(nickname, nickname),
          averageResponseTime: 1000,
          longestCorrectStreak: 2,
          correct: 2,
          comebackRankGain: 0,
        }),
      )

      expect(getComebackRankGainMetric(playerMetrics)).toBeNull()
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
