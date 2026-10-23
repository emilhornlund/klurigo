import { QuestionType } from '@klurigo/common'

import {
  BaseClassicScoringStrategy,
  ClassicAnswer,
  ClassicCorrect,
  ClassicMeta,
} from '../core/classic-base-scoring-strategy'

/** Scoring strategy for Puzzle questions in Classic mode. */
export class ClassicPuzzleScoringStrategy extends BaseClassicScoringStrategy<QuestionType.Puzzle> {
  public isCorrect(
    correct: ClassicCorrect<QuestionType.Puzzle>,
    answer: ClassicAnswer<QuestionType.Puzzle> | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    meta: ClassicMeta<QuestionType.Puzzle>,
  ): boolean {
    const correctValues = correct?.value
    const answerValues = answer?.answer

    return (
      this.isValidPermutation(correctValues, answerValues) &&
      answerValues !== undefined &&
      correctValues.every((value, index) => value === answerValues[index])
    )
  }

  public calculateScore(
    presented: Date,
    answered: Date,
    duration: number,
    points: number,
    correct: ClassicCorrect<QuestionType.Puzzle>,
    answer: ClassicAnswer<QuestionType.Puzzle> | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    meta: ClassicMeta<QuestionType.Puzzle>,
  ): number {
    if (!answer || !this.isAnsweredInTime(presented, answered, duration)) {
      return 0
    }

    const correctValues = correct?.value
    const answerValues = answer.answer
    if (!this.isValidPermutation(correctValues, answerValues)) {
      return 0
    }

    const { correctPairs, totalPairs } = this.countCorrectlyOrderedPairs(
      correctValues,
      answerValues!,
    )
    const baseScore = this.calculateBaseScore(
      presented,
      answered,
      duration,
      points,
    )
    const multiplier =
      totalPairs === 0 ? 1 : Math.max(0, 2 * (correctPairs / totalPairs) - 1)

    return Math.round(baseScore * multiplier)
  }

  /** Valid Puzzle sequences contain 3–6 values and the same values/counts. */
  private isValidPermutation(
    correctValues: string[] | undefined,
    answerValues: string[] | undefined,
  ): correctValues is string[] {
    if (
      !Array.isArray(correctValues) ||
      !Array.isArray(answerValues) ||
      correctValues.length < 3 ||
      correctValues.length > 6 ||
      correctValues.length !== answerValues.length
    ) {
      return false
    }
    if (
      !correctValues.every((value) => typeof value === 'string') ||
      !answerValues.every((value) => typeof value === 'string')
    ) {
      return false
    }

    const remainingCounts = new Map<string, number>()
    for (const value of correctValues) {
      remainingCounts.set(value, (remainingCounts.get(value) ?? 0) + 1)
    }

    for (const value of answerValues) {
      const remaining = remainingCounts.get(value)
      if (remaining === undefined) {
        return false
      }
      if (remaining === 1) {
        remainingCounts.delete(value)
      } else {
        remainingCounts.set(value, remaining - 1)
      }
    }

    return remainingCounts.size === 0
  }

  /** Counts distinct-value item pairs whose relative order is preserved. */
  private countCorrectlyOrderedPairs(
    correctValues: string[],
    answerValues: string[],
  ): { correctPairs: number; totalPairs: number } {
    const answerPositionsByValue = new Map<string, number[]>()
    answerValues.forEach((value, index) => {
      const positions = answerPositionsByValue.get(value) ?? []
      positions.push(index)
      answerPositionsByValue.set(value, positions)
    })

    const occurrenceIndexes = new Map<string, number>()
    const answerPositions = correctValues.map((value) => {
      const occurrenceIndex = occurrenceIndexes.get(value) ?? 0
      occurrenceIndexes.set(value, occurrenceIndex + 1)
      return answerPositionsByValue.get(value)![occurrenceIndex]
    })

    let correctPairs = 0
    let totalPairs = 0
    for (let left = 0; left < correctValues.length; left += 1) {
      for (let right = left + 1; right < correctValues.length; right += 1) {
        if (correctValues[left] === correctValues[right]) {
          continue
        }

        totalPairs += 1
        if (answerPositions[left] < answerPositions[right]) {
          correctPairs += 1
        }
      }
    }

    return { correctPairs, totalPairs }
  }
}
