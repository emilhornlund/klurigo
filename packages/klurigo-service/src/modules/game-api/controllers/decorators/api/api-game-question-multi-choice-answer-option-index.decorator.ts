import { QUIZ_MULTI_CHOICE_OPTIONS_MAX } from '@klurigo/common'
import { applyDecorators } from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'
import { IsInt, Max, Min } from 'class-validator'

/**
 * Decorator for documenting and validating the `optionIndex` property of a multi-choice answer.
 *
 * Applies:
 * - `@ApiProperty` for Swagger documentation.
 * - `@IsInt` to ensure the value is an integer.
 * - `@Min` to enforce the minimum value of 0.
 * - `@Max` to enforce the maximum value of 5.
 */
export function ApiGameQuestionMultiChoiceAnswerOptionIndex() {
  return applyDecorators(
    ApiProperty({
      title: 'Option Index',
      description: 'The submitted option index for the multi option question.',
      example: 0,
      required: true,
      minimum: 0,
      maximum: QUIZ_MULTI_CHOICE_OPTIONS_MAX - 1,
      type: Number,
    }),
    IsInt(),
    Min(0),
    Max(QUIZ_MULTI_CHOICE_OPTIONS_MAX - 1),
  )
}
