import { QuestionType } from '@klurigo/common'

import {
  ClassicAnswer,
  ClassicCorrect,
  ClassicMeta,
} from '../core/classic-base-scoring-strategy'

import { ClassicPuzzleScoringStrategy } from './classic-puzzle-strategy'

describe('ClassicPuzzleScoringStrategy', () => {
  const strategy = new ClassicPuzzleScoringStrategy()
  const meta = {} as ClassicMeta<QuestionType.Puzzle>
  const buildCorrect = (value: string[]): ClassicCorrect<QuestionType.Puzzle> =>
    ({ value }) as unknown as ClassicCorrect<QuestionType.Puzzle>
  const buildAnswer = (answer: string[]): ClassicAnswer<QuestionType.Puzzle> =>
    ({ answer }) as unknown as ClassicAnswer<QuestionType.Puzzle>
  const presented = new Date('2024-01-01T12:00:00.000Z')
  const duration = 30
  const points = 1000
  const score = (correct: string[], answer: string[], elapsedMs = 1000) =>
    strategy.calculateScore(
      presented,
      new Date(presented.getTime() + elapsedMs),
      duration,
      points,
      buildCorrect(correct),
      buildAnswer(answer),
      meta,
    )

  describe('isCorrect', () => {
    it.each([
      [
        ['A', 'B', 'C'],
        ['A', 'B', 'C'],
      ],
      [
        ['A', 'B', 'C', 'D'],
        ['A', 'B', 'C', 'D'],
      ],
      [
        ['A', 'B', 'C', 'D', 'E'],
        ['A', 'B', 'C', 'D', 'E'],
      ],
      [
        ['A', 'B', 'C', 'D', 'E', 'F'],
        ['A', 'B', 'C', 'D', 'E', 'F'],
      ],
      [
        ['A', 'A', 'B'],
        ['A', 'A', 'B'],
      ],
    ])('returns true for a fully correct sequence', (correct, answer) => {
      expect(
        strategy.isCorrect(buildCorrect(correct), buildAnswer(answer), meta),
      ).toBe(true)
    })

    it('returns false for a partial ordering, so it cannot extend a streak', () => {
      expect(
        strategy.isCorrect(
          buildCorrect(['A', 'B', 'C', 'D']),
          buildAnswer(['A', 'C', 'B', 'D']),
          meta,
        ),
      ).toBe(false)
    })

    it('returns false for missing, invalid, or non-permutation answers', () => {
      const correct = buildCorrect(['A', 'B', 'C'])

      expect(strategy.isCorrect(correct, undefined, meta)).toBe(false)
      expect(strategy.isCorrect(correct, buildAnswer(['A', 'B']), meta)).toBe(
        false,
      )
      expect(
        strategy.isCorrect(correct, buildAnswer(['A', 'B', 'D']), meta),
      ).toBe(false)
      expect(
        strategy.isCorrect(
          buildCorrect(['A', 'A', 'B']),
          buildAnswer(['A', 'B', 'B']),
          meta,
        ),
      ).toBe(false)
      expect(
        strategy.isCorrect(
          buildCorrect(['A', undefined, 'C'] as unknown as string[]),
          buildAnswer(['A', undefined, 'C'] as unknown as string[]),
          meta,
        ),
      ).toBe(false)
    })

    it('rejects unsupported Puzzle sizes', () => {
      expect(
        strategy.isCorrect(
          buildCorrect(['A', 'B']),
          buildAnswer(['A', 'B']),
          meta,
        ),
      ).toBe(false)
      expect(
        strategy.isCorrect(
          buildCorrect(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
          buildAnswer(['A', 'B', 'C', 'D', 'E', 'F', 'G']),
          meta,
        ),
      ).toBe(false)
    })
  })

  describe('calculateScore', () => {
    it.each([
      ['A', 'B', 'C'],
      ['A', 'B', 'C', 'D'],
      ['A', 'B', 'C', 'D', 'E'],
      ['A', 'B', 'C', 'D', 'E', 'F'],
    ])('awards full time-adjusted points for %i-value puzzles', (...values) => {
      expect(score(values, values)).toBe(983)
    })

    it('awards full time-adjusted points when all puzzle values are identical', () => {
      expect(score(['A', 'A', 'A'], ['A', 'A', 'A'])).toBe(983)
    })

    it('awards reduced points using pairwise ordering accuracy', () => {
      // Five of six distinct-value pairs are ordered correctly: 2 * 5/6 - 1 = 2/3.
      expect(score(['A', 'B', 'C', 'D'], ['A', 'C', 'B', 'D'])).toBe(656)
    })

    it('awards zero at or below 50% pairwise accuracy', () => {
      expect(score(['A', 'B', 'C'], ['C', 'B', 'A'])).toBe(0)
      expect(score(['A', 'B', 'C', 'D'], ['C', 'B', 'A', 'D'])).toBe(0)
      expect(score(['A', 'B', 'C', 'D'], ['D', 'C', 'B', 'A'])).toBe(0)
    })

    it('excludes identical-value pairs from accuracy', () => {
      // Four of five distinct-value pairs preserve their order; identical A pairs are excluded.
      expect(score(['A', 'A', 'B', 'C'], ['A', 'B', 'A', 'C'])).toBe(590)
      expect(score(['A', 'A', 'B'], ['A', 'A', 'B'])).toBe(983)
    })

    it('returns zero for missing, invalid, late, and non-permutation answers', () => {
      const correct = buildCorrect(['A', 'B', 'C'])
      const at = new Date(presented.getTime() + 1000)
      const late = new Date(presented.getTime() + (duration + 1) * 1000)

      expect(
        strategy.calculateScore(
          presented,
          at,
          duration,
          points,
          correct,
          undefined,
          meta,
        ),
      ).toBe(0)
      expect(
        strategy.calculateScore(
          presented,
          undefined as never,
          duration,
          points,
          correct,
          buildAnswer(['A', 'B', 'C']),
          meta,
        ),
      ).toBe(0)
      expect(
        strategy.calculateScore(
          presented,
          late,
          duration,
          points,
          correct,
          buildAnswer(['A', 'B', 'C']),
          meta,
        ),
      ).toBe(0)
      expect(score(['A', 'B', 'C'], ['A', 'A', 'C'])).toBe(0)
      expect(score(['A', 'A', 'B'], ['A', 'B', 'B'])).toBe(0)
    })

    it('preserves Classic time-based scoring for partial credit', () => {
      const fast = score(['A', 'B', 'C', 'D'], ['A', 'C', 'B', 'D'], 2000)
      const slow = score(['A', 'B', 'C', 'D'], ['A', 'C', 'B', 'D'], 15000)

      expect(fast).toBeGreaterThan(slow)
    })
  })
})
