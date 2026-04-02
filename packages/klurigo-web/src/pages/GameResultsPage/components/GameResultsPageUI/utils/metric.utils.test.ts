import { GameMode } from '@klurigo/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import colors from '../../../../../styles/colors.tokens.module.scss'

import {
  buildPlayerSectionMetricDetails,
  buildQuestionSectionMetricDetails,
  getAveragePrecision,
  getCorrectPercentage,
  getQuizDifficultyMessage,
} from './metric.utils'

const h = vi.hoisted(() => ({
  formatRoundedSeconds: vi.fn((ms: number) => `sec:${ms}`),
}))
vi.mock('./format.utils', () => ({
  formatRoundedSeconds: h.formatRoundedSeconds,
}))

beforeEach(() => {
  h.formatRoundedSeconds.mockClear()
})

describe('getCorrectPercentage', () => {
  it('returns 0 when total is 0', () => {
    expect(
      getCorrectPercentage({
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as any),
    ).toBe(0)
  })

  it('rounds up to nearest integer', () => {
    expect(
      getCorrectPercentage({
        correct: 1,
        incorrect: 2,
        unanswered: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as any),
    ).toBe(34)
    expect(
      getCorrectPercentage({
        correct: 2,
        incorrect: 1,
        unanswered: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as any),
    ).toBe(67)
  })

  it('returns 100 when all correct', () => {
    expect(
      getCorrectPercentage({
        correct: 5,
        incorrect: 0,
        unanswered: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as any),
    ).toBe(100)
  })
})

describe('getAveragePrecision', () => {
  it('converts 0–1 to 0–100 and rounds up', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getAveragePrecision({ averagePrecision: 0 } as unknown as any)).toBe(
      0,
    )
    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getAveragePrecision({ averagePrecision: 0.331 } as unknown as any),
    ).toBe(34)
    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getAveragePrecision({ averagePrecision: 0.999 } as unknown as any),
    ).toBe(100)
  })
})

describe('getQuizDifficultyMessage', () => {
  it('returns correct message per threshold', () => {
    expect(getQuizDifficultyMessage(0)).toBe(
      'This one was a brain-buster. Tougher than most could handle!',
    )
    expect(getQuizDifficultyMessage(19)).toBe(
      'This one was a brain-buster. Tougher than most could handle!',
    )
    expect(getQuizDifficultyMessage(20)).toBe(
      'Challenging quiz! Only a few managed to crack these questions.',
    )
    expect(getQuizDifficultyMessage(39)).toBe(
      'Challenging quiz! Only a few managed to crack these questions.',
    )
    expect(getQuizDifficultyMessage(40)).toBe(
      'A balanced battle — tricky, but not impossible.',
    )
    expect(getQuizDifficultyMessage(59)).toBe(
      'A balanced battle — tricky, but not impossible.',
    )
    expect(getQuizDifficultyMessage(60)).toBe(
      'Well played! Most players handled the challenge with confidence.',
    )
    expect(getQuizDifficultyMessage(79)).toBe(
      'Well played! Most players handled the challenge with confidence.',
    )
    expect(getQuizDifficultyMessage(80)).toBe(
      'Nice and smooth — players breezed through most questions!',
    )
    expect(getQuizDifficultyMessage(94)).toBe(
      'Nice and smooth — players breezed through most questions!',
    )
    expect(getQuizDifficultyMessage(95)).toBe(
      "Too easy! Next time, let's turn up the difficulty.",
    )
    expect(getQuizDifficultyMessage(100)).toBe(
      "Too easy! Next time, let's turn up the difficulty.",
    )
  })
})

describe('buildPlayerSectionMetricDetails', () => {
  it('returns classic-mode details with correct ordering and values', () => {
    const metric = {
      correct: 7,
      incorrect: 2,
      unanswered: 1,
      averageResponseTime: 3200,
      longestCorrectStreak: 5,
      score: 420,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as any

    const details = buildPlayerSectionMetricDetails(GameMode.Classic, metric)

    expect(details.map((d) => d.title)).toEqual([
      'Correct',
      'Incorrect',
      'Unanswered',
      'Average response time',
      'Longest correct streak',
      'Score',
    ])

    expect(details.find((d) => d.title === 'Correct')?.value).toBe(7)
    expect(details.find((d) => d.title === 'Incorrect')?.value).toBe(2)
    expect(details.find((d) => d.title === 'Unanswered')?.value).toBe(1)
    expect(
      details.find((d) => d.title === 'Average response time')?.value,
    ).toBe('sec:3200')
    expect(
      details.find((d) => d.title === 'Longest correct streak')?.value,
    ).toBe(5)
    expect(details.find((d) => d.title === 'Score')?.value).toBe(420)

    expect(details.find((d) => d.title === 'Unanswered')?.iconColor).toBe(
      colors.colorActionDefault,
    )
    expect(
      details.find((d) => d.title === 'Average response time')?.iconColor,
    ).toBe(colors.colorStatusInfo)
    expect(
      details.find((d) => d.title === 'Longest correct streak')?.iconColor,
    ).toBe(colors.colorStatusWarning)
    expect(details.find((d) => d.title === 'Score')?.iconColor).toBe(
      colors.colorRatingDefault,
    )
  })

  it('returns zero-to-one-hundred common details without correct/incorrect', () => {
    const metric = {
      unanswered: 3,
      averageResponseTime: 2500,
      longestCorrectStreak: 0,
      score: 0,
      averagePrecision: 0.42,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as any

    const details = buildPlayerSectionMetricDetails(
      GameMode.ZeroToOneHundred,
      metric,
    )

    expect(details.map((d) => d.title)).toEqual([
      'Unanswered',
      'Average response time',
      'Longest correct streak',
      'Score',
    ])
    expect(details.some((d) => d.title === 'Correct')).toBe(false)
    expect(details.some((d) => d.title === 'Incorrect')).toBe(false)
    expect(
      details.find((d) => d.title === 'Average response time')?.value,
    ).toBe('sec:2500')
  })
})

describe('buildQuestionSectionMetricDetails', () => {
  it('returns classic-mode question details with correct ordering and values', () => {
    const metric = {
      correct: 8,
      incorrect: 1,
      unanswered: 1,
      averageResponseTime: 4100,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as any

    const details = buildQuestionSectionMetricDetails(GameMode.Classic, metric)

    expect(details.map((d) => d.title)).toEqual([
      'Correct',
      'Incorrect',
      'Unanswered',
      'Average response time',
    ])

    expect(details.find((d) => d.title === 'Correct')?.value).toBe(8)
    expect(details.find((d) => d.title === 'Incorrect')?.value).toBe(1)
    expect(details.find((d) => d.title === 'Unanswered')?.value).toBe(1)
    expect(
      details.find((d) => d.title === 'Average response time')?.value,
    ).toBe('sec:4100')

    expect(details.find((d) => d.title === 'Unanswered')?.iconColor).toBe(
      colors.colorActionDefault,
    )
    expect(
      details.find((d) => d.title === 'Average response time')?.iconColor,
    ).toBe(colors.colorStatusInfo)
  })

  it('returns zero-to-one-hundred question common details only', () => {
    const metric = {
      unanswered: 0,
      averageResponseTime: 1800,
      averagePrecision: 0.73,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as any

    const details = buildQuestionSectionMetricDetails(
      GameMode.ZeroToOneHundred,
      metric,
    )

    expect(details.map((d) => d.title)).toEqual([
      'Unanswered',
      'Average response time',
    ])
    expect(details.some((d) => d.title === 'Correct')).toBe(false)
    expect(details.some((d) => d.title === 'Incorrect')).toBe(false)
    expect(
      details.find((d) => d.title === 'Average response time')?.value,
    ).toBe('sec:1800')
  })
})
