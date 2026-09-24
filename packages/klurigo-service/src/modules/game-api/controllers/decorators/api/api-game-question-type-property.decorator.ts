import { QuestionType } from '@klurigo/common'
import { applyDecorators } from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'

/**
 * Decorator for documenting and validating the `type` property of a question.
 *
 * Applies:
 * - `@ApiProperty` for Swagger documentation.
 * - `@IsEnum` to ensure the value is a valid question type.
 */
export function ApiGameQuestionTypeProperty(type: QuestionType) {
  return applyDecorators(
    ApiProperty({
      title: 'Type',
      description: `The type of the question, which is set to ${type} for this request.`,
      enum: [type],
      example: type,
      required: true,
      type: String,
    }),
    IsEnum(QuestionType),
  )
}
