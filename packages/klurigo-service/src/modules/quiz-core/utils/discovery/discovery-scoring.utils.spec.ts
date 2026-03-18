import {
  QuestionType,
  QUIZ_DESCRIPTION_MAX_LENGTH,
  QUIZ_QUESTION_MAX,
} from '@klurigo/common'

import { Quiz } from '../../repositories/models/schemas'

import {
  computeBayesianRatingScore,
  computeQualityScore,
  computeTrendingScore,
  PLAY_SCALE_MAX,
  PLAYER_SCALE_MAX,
  QUALITY_WEIGHT_COVER,
  QUALITY_WEIGHT_DESCRIPTION,
  QUALITY_WEIGHT_PLAYERS,
  QUALITY_WEIGHT_PLAYS,
  QUALITY_WEIGHT_QUESTION_INFO,
  QUALITY_WEIGHT_QUESTION_MEDIA,
  QUALITY_WEIGHT_QUESTION_VARIETY,
  QUALITY_WEIGHT_QUESTIONS,
  QUALITY_WEIGHT_RATING,
  RecentActivityStats,
  TOTAL_QUESTION_TYPES,
  TRENDING_PLAY_WEIGHT,
  TRENDING_SCALE_MAX,
  TRENDING_WINDOW_DAYS,
} from './discovery-scoring.utils'

const makeQuiz = (overrides: Partial<Quiz> = {}): Quiz =>
  ({
    imageCoverURL: 'https://example.com/cover.jpg',
    description: 'A quiz with a sufficiently long description',
    questions: Array.from({ length: 10 }, (_, i) => ({
      _id: `q${i}`,
      type: QuestionType.MultiChoice,
    })),
    gameplaySummary: {
      count: 0,
      totalPlayerCount: 0,
    },
    ratingSummary: {
      count: 0,
      avg: 0,
    },
    ...overrides,
  }) as unknown as Quiz

const DESCRIPTION_THRESHOLD_LOW = Math.floor(QUIZ_DESCRIPTION_MAX_LENGTH * 0.04)
const DESCRIPTION_THRESHOLD_MEDIUM = Math.floor(
  QUIZ_DESCRIPTION_MAX_LENGTH * 0.1,
)
const DESCRIPTION_THRESHOLD_HIGH = Math.floor(QUIZ_DESCRIPTION_MAX_LENGTH * 0.2)
const DESCRIPTION_THRESHOLD_FULL = Math.floor(QUIZ_DESCRIPTION_MAX_LENGTH * 0.4)

const QUESTION_THRESHOLD_LOW = Math.floor(QUIZ_QUESTION_MAX * 0.2)
const QUESTION_THRESHOLD_MEDIUM = Math.floor(QUIZ_QUESTION_MAX * 0.3)
const QUESTION_THRESHOLD_HIGH = Math.floor(QUIZ_QUESTION_MAX * 0.4)
const QUESTION_THRESHOLD_FULL = Math.floor(QUIZ_QUESTION_MAX * 0.6)

describe('computeBayesianRatingScore', () => {
  const globalMean = 3.5
  const minCount = 10

  it('should pull a low-count quiz toward the global mean', () => {
    const quiz = makeQuiz({
      ratingSummary: { count: 1, avg: 5 } as never,
    })

    const score = computeBayesianRatingScore(quiz, globalMean, minCount)

    expect(score).toBeCloseTo((1 / 11) * 5 + (10 / 11) * globalMean, 5)
    expect(score).toBeLessThan(5)
    expect(score).toBeGreaterThan(globalMean)
  })

  it('should stay near the quiz average for a high-count quiz', () => {
    const quiz = makeQuiz({
      ratingSummary: { count: 1000, avg: 4.8 } as never,
    })

    const score = computeBayesianRatingScore(quiz, globalMean, minCount)

    expect(score).toBeCloseTo((1000 / 1010) * 4.8 + (10 / 1010) * globalMean, 5)
    expect(score).toBeGreaterThan(4.7)
  })

  it('should equal globalMean when rating count is zero', () => {
    const quiz = makeQuiz({
      ratingSummary: { count: 0, avg: 0 } as never,
    })

    const score = computeBayesianRatingScore(quiz, globalMean, minCount)

    expect(score).toBeCloseTo(globalMean, 5)
  })

  it('should fall back to globalMean when ratingSummary is missing', () => {
    const quiz = makeQuiz({
      ratingSummary: undefined as never,
    })

    const score = computeBayesianRatingScore(quiz, globalMean, minCount)

    expect(score).toBeCloseTo(globalMean, 5)
  })

  it('should fall back to globalMean when ratingSummary fields are missing', () => {
    const quiz = makeQuiz({
      ratingSummary: {} as never,
    })

    const score = computeBayesianRatingScore(quiz, globalMean, minCount)

    expect(score).toBeCloseTo(globalMean, 5)
  })

  it('should remain within [0, 5] for valid inputs', () => {
    const quiz = makeQuiz({
      ratingSummary: { count: 50, avg: 4.0 } as never,
    })

    const score = computeBayesianRatingScore(quiz, globalMean, minCount)

    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(5)
  })

  it('should not return NaN when ratingSummary is missing', () => {
    const quiz = makeQuiz({
      ratingSummary: undefined as never,
    })

    const score = computeBayesianRatingScore(quiz, globalMean, minCount)

    expect(score).not.toBeNaN()
    expect(Number.isFinite(score)).toBe(true)
  })
})

describe('computeQualityScore', () => {
  const globalMean = 3.5
  const minRatingCount = 10

  it('should return a result within [0, 100]', () => {
    const score = computeQualityScore(makeQuiz(), globalMean, minRatingCount)

    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should cap the total score at 100 for oversaturated input', () => {
    const questions = Array.from({ length: 200 }, (_, i) => ({
      _id: `q${i}`,
      type: Object.values(QuestionType)[i % Object.values(QuestionType).length],
      info: `Info ${i}`,
      media: { type: 'IMAGE', url: `https://img.com/q${i}.jpg` },
    }))

    const quiz = makeQuiz({
      imageCoverURL: 'https://img.com/cover.jpg',
      description: 'A'.repeat(QUIZ_DESCRIPTION_MAX_LENGTH * 2),
      questions: questions as never,
      gameplaySummary: {
        count: PLAY_SCALE_MAX * 100,
        totalPlayerCount: PLAYER_SCALE_MAX * 100,
      } as never,
      ratingSummary: { count: 100000, avg: 5 } as never,
    })

    expect(computeQualityScore(quiz, 5, minRatingCount)).toBe(100)
  })

  it('should increase when total plays increase', () => {
    const fewerPlays = makeQuiz({
      gameplaySummary: { count: 10, totalPlayerCount: 5 } as never,
    })
    const morePlays = makeQuiz({
      gameplaySummary: { count: 1000, totalPlayerCount: 500 } as never,
    })

    expect(
      computeQualityScore(morePlays, globalMean, minRatingCount),
    ).toBeGreaterThan(
      computeQualityScore(fewerPlays, globalMean, minRatingCount),
    )
  })

  it('should change when globalMean changes', () => {
    const quiz = makeQuiz({
      ratingSummary: { count: 5, avg: 4 } as never,
    })

    const scoreA = computeQualityScore(quiz, 2.0, minRatingCount)
    const scoreB = computeQualityScore(quiz, 4.5, minRatingCount)

    expect(scoreA).not.toEqual(scoreB)
  })

  it('should change when minRatingCount changes', () => {
    const quiz = makeQuiz({
      ratingSummary: { count: 5, avg: 4 } as never,
    })

    const scoreA = computeQualityScore(quiz, globalMean, 5)
    const scoreB = computeQualityScore(quiz, globalMean, 50)

    expect(scoreA).not.toEqual(scoreB)
  })

  describe('cover sub-score', () => {
    it('should award the cover weight when a non-blank cover exists', () => {
      const withCover = makeQuiz({
        imageCoverURL: 'https://img.com/c.jpg',
        description: undefined,
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withoutCover = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      const diff =
        computeQualityScore(withCover, globalMean, minRatingCount) -
        computeQualityScore(withoutCover, globalMean, minRatingCount)

      expect(diff).toBeCloseTo(QUALITY_WEIGHT_COVER, 5)
    })

    it('should treat whitespace-only imageCoverURL as absent', () => {
      const withBlankCover = makeQuiz({ imageCoverURL: '   ' })
      const withoutCover = makeQuiz({ imageCoverURL: undefined })

      expect(
        computeQualityScore(withBlankCover, globalMean, minRatingCount),
      ).toEqual(computeQualityScore(withoutCover, globalMean, minRatingCount))
    })
  })

  describe('description sub-score', () => {
    it.each([
      [DESCRIPTION_THRESHOLD_LOW - 1, 0],
      [DESCRIPTION_THRESHOLD_LOW, 4],
      [DESCRIPTION_THRESHOLD_MEDIUM - 1, 4],
      [DESCRIPTION_THRESHOLD_MEDIUM, 8],
      [DESCRIPTION_THRESHOLD_HIGH - 1, 8],
      [DESCRIPTION_THRESHOLD_HIGH, 12],
      [DESCRIPTION_THRESHOLD_FULL - 1, 12],
      [DESCRIPTION_THRESHOLD_FULL, QUALITY_WEIGHT_DESCRIPTION],
    ])(
      'should award %i description score at length boundary %i',
      (length, expectedDescScore) => {
        const withDescription = makeQuiz({
          imageCoverURL: undefined,
          description: 'A'.repeat(length),
          questions: [] as never,
          gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
          ratingSummary: { count: 0, avg: 0 } as never,
        })
        const withoutDescription = makeQuiz({
          imageCoverURL: undefined,
          description: undefined,
          questions: [] as never,
          gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
          ratingSummary: { count: 0, avg: 0 } as never,
        })

        const diff =
          computeQualityScore(withDescription, globalMean, minRatingCount) -
          computeQualityScore(withoutDescription, globalMean, minRatingCount)

        expect(diff).toBeCloseTo(expectedDescScore, 5)
      },
    )

    it('should use trimmed description length', () => {
      const withPaddedDesc = makeQuiz({
        imageCoverURL: undefined,
        description: `   ${'A'.repeat(DESCRIPTION_THRESHOLD_LOW)}   `,
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withExactDesc = makeQuiz({
        imageCoverURL: undefined,
        description: 'A'.repeat(DESCRIPTION_THRESHOLD_LOW),
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      expect(
        computeQualityScore(withPaddedDesc, globalMean, minRatingCount),
      ).toEqual(computeQualityScore(withExactDesc, globalMean, minRatingCount))
    })
  })

  describe('question count sub-score', () => {
    it.each([
      [QUESTION_THRESHOLD_LOW - 1, 0],
      [QUESTION_THRESHOLD_LOW, 4],
      [QUESTION_THRESHOLD_MEDIUM - 1, 4],
      [QUESTION_THRESHOLD_MEDIUM, 6],
      [QUESTION_THRESHOLD_HIGH - 1, 6],
      [QUESTION_THRESHOLD_HIGH, 8],
      [QUESTION_THRESHOLD_FULL - 1, 8],
      [QUESTION_THRESHOLD_FULL, QUALITY_WEIGHT_QUESTIONS],
    ])(
      'should award %i question score at count boundary %i',
      (count, expectedQuestionScore) => {
        const withQuestions = makeQuiz({
          imageCoverURL: undefined,
          description: undefined,
          questions: Array.from({ length: count }, (_, i) => ({
            _id: `q${i}`,
            type: QuestionType.MultiChoice,
          })) as never,
          gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
          ratingSummary: { count: 0, avg: 0 } as never,
        })
        const baseline = makeQuiz({
          imageCoverURL: undefined,
          description: undefined,
          questions: [{ _id: 'base', type: QuestionType.MultiChoice }] as never,
          gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
          ratingSummary: { count: 0, avg: 0 } as never,
        })

        const diff =
          computeQualityScore(withQuestions, globalMean, minRatingCount) -
          computeQualityScore(baseline, globalMean, minRatingCount)

        expect(diff).toBeCloseTo(expectedQuestionScore, 5)
      },
    )
  })

  describe('play sub-score', () => {
    it('should contribute 0 when play count is 0', () => {
      const quiz = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      expect(computeQualityScore(quiz, 0, minRatingCount)).toBe(0)
    })

    it('should award the full play weight at PLAY_SCALE_MAX', () => {
      const withoutPlays = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withMaxPlays = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: {
          count: PLAY_SCALE_MAX,
          totalPlayerCount: 0,
        } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      const diff =
        computeQualityScore(withMaxPlays, 0, minRatingCount) -
        computeQualityScore(withoutPlays, 0, minRatingCount)

      expect(diff).toBeCloseTo(QUALITY_WEIGHT_PLAYS, 5)
    })

    it('should follow the documented log-scale formula', () => {
      const playCount = 99
      const withoutPlays = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withPlays = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: { count: playCount, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      const diff =
        computeQualityScore(withPlays, 0, minRatingCount) -
        computeQualityScore(withoutPlays, 0, minRatingCount)

      const expected = Math.min(
        QUALITY_WEIGHT_PLAYS,
        (QUALITY_WEIGHT_PLAYS * Math.log10(playCount + 1)) /
          Math.log10(PLAY_SCALE_MAX),
      )

      expect(diff).toBeCloseTo(expected, 5)
    })
  })

  describe('unique player sub-score', () => {
    it('should award the full player weight at PLAYER_SCALE_MAX', () => {
      const withoutPlayers = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withMaxPlayers = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: {
          count: 0,
          totalPlayerCount: PLAYER_SCALE_MAX,
        } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      const diff =
        computeQualityScore(withMaxPlayers, 0, minRatingCount) -
        computeQualityScore(withoutPlayers, 0, minRatingCount)

      expect(diff).toBeCloseTo(QUALITY_WEIGHT_PLAYERS, 5)
    })

    it('should follow the documented log-scale formula', () => {
      const playerCount = 99
      const withoutPlayers = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withPlayers = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: {
          count: 0,
          totalPlayerCount: playerCount,
        } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      const diff =
        computeQualityScore(withPlayers, 0, minRatingCount) -
        computeQualityScore(withoutPlayers, 0, minRatingCount)

      const expected = Math.min(
        QUALITY_WEIGHT_PLAYERS,
        (QUALITY_WEIGHT_PLAYERS * Math.log10(playerCount + 1)) /
          Math.log10(PLAYER_SCALE_MAX),
      )

      expect(diff).toBeCloseTo(expected, 5)
    })
  })

  describe('rating sub-score', () => {
    it('should map a near-perfect Bayesian rating to the full rating weight', () => {
      const quiz = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 10000, avg: 5 } as never,
      })

      expect(computeQualityScore(quiz, 5, minRatingCount)).toBeCloseTo(
        QUALITY_WEIGHT_RATING,
        2,
      )
    })

    it('should map an unrated quiz from globalMean through the rating weight', () => {
      const quiz = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: undefined as never,
      })

      const score = computeQualityScore(quiz, globalMean, minRatingCount)

      expect(score).toBeCloseTo(globalMean * (QUALITY_WEIGHT_RATING / 5), 5)
    })

    it('should score a high-count perfect quiz higher than a low-count perfect quiz', () => {
      const lowCountQuiz = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 1, avg: 5 } as never,
      })
      const highCountQuiz = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 500, avg: 5 } as never,
      })

      expect(
        computeQualityScore(highCountQuiz, globalMean, minRatingCount),
      ).toBeGreaterThan(
        computeQualityScore(lowCountQuiz, globalMean, minRatingCount),
      )
    })
  })

  describe('question media density sub-score', () => {
    it('should award the full media weight when all questions have normal media', () => {
      const withoutMedia = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withAllMedia = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
          media: { type: 'IMAGE', url: `https://img.com/q${i}.jpg` },
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      const diff =
        computeQualityScore(withAllMedia, globalMean, minRatingCount) -
        computeQualityScore(withoutMedia, globalMean, minRatingCount)

      expect(diff).toBeCloseTo(QUALITY_WEIGHT_QUESTION_MEDIA, 5)
    })

    it('should award half the media weight when half the questions have media', () => {
      const withoutMedia = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withHalfMedia = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
          media:
            i < 5
              ? { type: 'IMAGE', url: `https://img.com/q${i}.jpg` }
              : undefined,
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      const diff =
        computeQualityScore(withHalfMedia, globalMean, minRatingCount) -
        computeQualityScore(withoutMedia, globalMean, minRatingCount)

      expect(diff).toBeCloseTo(QUALITY_WEIGHT_QUESTION_MEDIA / 2, 5)
    })

    it('should count audio and video media the same as image media', () => {
      const withoutMedia = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withAudioMedia = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
          media: { type: 'AUDIO', url: `https://cdn.com/q${i}.mp3` },
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      const diff =
        computeQualityScore(withAudioMedia, globalMean, minRatingCount) -
        computeQualityScore(withoutMedia, globalMean, minRatingCount)

      expect(diff).toBeCloseTo(QUALITY_WEIGHT_QUESTION_MEDIA, 5)
    })

    it('should count Pin questions with imageURL as having media', () => {
      const withoutPinMedia = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.Pin,
          imageURL: undefined,
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withPinMedia = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.Pin,
          imageURL: `https://img.com/pin${i}.jpg`,
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      const diff =
        computeQualityScore(withPinMedia, globalMean, minRatingCount) -
        computeQualityScore(withoutPinMedia, globalMean, minRatingCount)

      expect(diff).toBeCloseTo(QUALITY_WEIGHT_QUESTION_MEDIA, 5)
    })

    it('should score 0 media when questions are empty or missing', () => {
      const withEmpty = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: [] as never,
      })
      const withUndefined = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: undefined as never,
      })

      expect(computeQualityScore(withEmpty, globalMean, minRatingCount)).toBe(
        computeQualityScore(withUndefined, globalMean, minRatingCount),
      )
    })
  })

  describe('question info density sub-score', () => {
    it('should award the full info weight when all questions have info', () => {
      const withoutInfo = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withAllInfo = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
          info: `Helpful info ${i}`,
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      const diff =
        computeQualityScore(withAllInfo, globalMean, minRatingCount) -
        computeQualityScore(withoutInfo, globalMean, minRatingCount)

      expect(diff).toBeCloseTo(QUALITY_WEIGHT_QUESTION_INFO, 5)
    })

    it('should award half the info weight when half the questions have info', () => {
      const withoutInfo = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withHalfInfo = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
          info: i < 5 ? `Helpful info ${i}` : undefined,
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      const diff =
        computeQualityScore(withHalfInfo, globalMean, minRatingCount) -
        computeQualityScore(withoutInfo, globalMean, minRatingCount)

      expect(diff).toBeCloseTo(QUALITY_WEIGHT_QUESTION_INFO / 2, 5)
    })

    it('should ignore blank or whitespace-only info', () => {
      const withoutInfo = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })
      const withBlankInfo = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        questions: Array.from({ length: 10 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
          info: i < 5 ? '   ' : '',
        })) as never,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
      })

      expect(
        computeQualityScore(withBlankInfo, globalMean, minRatingCount),
      ).toBeCloseTo(
        computeQualityScore(withoutInfo, globalMean, minRatingCount),
        5,
      )
    })
  })

  describe('question type variety sub-score', () => {
    it('should award a higher score for mixed question types than a single repeated type', () => {
      const singleType = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
        questions: Array.from({ length: 6 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
        })) as never,
      })
      const mixedTypes = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
        questions: Object.values(QuestionType).map((type, i) => ({
          _id: `q${i}`,
          type,
        })) as never,
      })

      expect(
        computeQualityScore(mixedTypes, globalMean, minRatingCount),
      ).toBeGreaterThan(
        computeQualityScore(singleType, globalMean, minRatingCount),
      )
    })

    it('should award the full variety weight when all question types are used', () => {
      const withoutVariety = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
        questions: Array.from({ length: 6 }, (_, i) => ({
          _id: `q${i}`,
          type: QuestionType.MultiChoice,
        })) as never,
      })
      const withAllTypes = makeQuiz({
        imageCoverURL: undefined,
        description: undefined,
        gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
        ratingSummary: { count: 0, avg: 0 } as never,
        questions: Object.values(QuestionType).map((type, i) => ({
          _id: `q${i}`,
          type,
        })) as never,
      })

      const diff =
        computeQualityScore(withAllTypes, globalMean, minRatingCount) -
        computeQualityScore(withoutVariety, globalMean, minRatingCount)

      const expected =
        QUALITY_WEIGHT_QUESTION_VARIETY -
        (1 / TOTAL_QUESTION_TYPES) * QUALITY_WEIGHT_QUESTION_VARIETY

      expect(diff).toBeCloseTo(expected, 5)
    })

    it('should increase proportionally as the number of distinct types increases', () => {
      const types = Object.values(QuestionType)

      const scores = [1, 2, 3, 4, 5, 6].map((n) =>
        computeQualityScore(
          makeQuiz({
            imageCoverURL: undefined,
            description: undefined,
            gameplaySummary: { count: 0, totalPlayerCount: 0 } as never,
            ratingSummary: { count: 0, avg: 0 } as never,
            questions: types.slice(0, n).map((type, i) => ({
              _id: `q${i}`,
              type,
            })) as never,
          }),
          globalMean,
          minRatingCount,
        ),
      )

      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeGreaterThan(scores[i - 1])
      }
    })
  })

  describe('robustness', () => {
    it('should not throw when ratingSummary is missing', () => {
      const quiz = makeQuiz({ ratingSummary: undefined as never })

      expect(() =>
        computeQualityScore(quiz, globalMean, minRatingCount),
      ).not.toThrow()
    })

    it('should not throw when gameplaySummary is missing', () => {
      const quiz = makeQuiz({ gameplaySummary: undefined as never })

      expect(() =>
        computeQualityScore(quiz, globalMean, minRatingCount),
      ).not.toThrow()
    })

    it('should not throw when questions is missing', () => {
      const quiz = makeQuiz({ questions: undefined as never })

      expect(() =>
        computeQualityScore(quiz, globalMean, minRatingCount),
      ).not.toThrow()
    })

    it('should return a score within [0, 100] when partial documents are missing', () => {
      const quizzes = [
        makeQuiz({ ratingSummary: undefined as never }),
        makeQuiz({ gameplaySummary: undefined as never }),
        makeQuiz({ questions: undefined as never }),
      ]

      for (const quiz of quizzes) {
        const score = computeQualityScore(quiz, globalMean, minRatingCount)
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      }
    })
  })
})

describe('computeTrendingScore', () => {
  it('should return 0 for zero recent plays', () => {
    const stats: RecentActivityStats = { recentPlayCount: 0 }

    expect(computeTrendingScore(stats)).toBe(0)
  })

  it('should increase as recentPlayCount increases', () => {
    const low: RecentActivityStats = { recentPlayCount: 10 }
    const high: RecentActivityStats = { recentPlayCount: 100 }

    expect(computeTrendingScore(high)).toBeGreaterThan(
      computeTrendingScore(low),
    )
  })

  it('should be capped at 100', () => {
    const stats: RecentActivityStats = { recentPlayCount: 999999 }

    expect(computeTrendingScore(stats)).toBe(100)
  })

  it('should return 100 when recentPlayCount reaches the scale max', () => {
    const stats: RecentActivityStats = {
      recentPlayCount: TRENDING_SCALE_MAX / TRENDING_PLAY_WEIGHT,
    }

    expect(computeTrendingScore(stats)).toBe(100)
  })

  it('should follow the documented linear formula', () => {
    const stats: RecentActivityStats = { recentPlayCount: 100 }

    const expected = Math.min(
      100,
      ((100 * TRENDING_PLAY_WEIGHT) / TRENDING_SCALE_MAX) * 100,
    )

    expect(computeTrendingScore(stats)).toBeCloseTo(expected, 5)
  })

  it('should always remain within [0, 100]', () => {
    const values = [0, 1, 50, 100, 500, 1000, 10000, 100000]

    for (const value of values) {
      const score = computeTrendingScore({ recentPlayCount: value })
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    }
  })

  it('should keep the documented configuration values', () => {
    expect(TRENDING_PLAY_WEIGHT).toBe(1)
    expect(TRENDING_WINDOW_DAYS).toBe(30)
    expect(TRENDING_SCALE_MAX).toBe(10000)
  })
})
