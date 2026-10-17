import { QuestionType } from '@klurigo/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { createMockQuestionZeroToOneHundredRangeDto } from '../../../../../test-utils/data'

import { QuestionZeroToOneHundredRange } from './question-zero-to-one-hundred-range'

describe('QuestionZeroToOneHundredRange', () => {
  it.each([0, 25, 100])('accepts the integer answer %s', async (correct) => {
    const question = plainToInstance(
      QuestionZeroToOneHundredRange,
      createMockQuestionZeroToOneHundredRangeDto({
        type: QuestionType.Range,
        correct,
      }),
    )

    expect(await validate(question)).toHaveLength(0)
  })

  it.each([25.5, -1, 101])(
    'rejects invalid integer answer %s',
    async (correct) => {
      const question = plainToInstance(
        QuestionZeroToOneHundredRange,
        createMockQuestionZeroToOneHundredRangeDto({
          type: QuestionType.Range,
          correct,
        }),
      )

      const errors = await validate(question)
      expect(errors.some(({ property }) => property === 'correct')).toBe(true)
    },
  )
})
