import { applyDecorators } from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'
import { Validate } from 'class-validator'

import { SupportedQuestionMediaUrlConstraint } from './is-supported-question-media-url'

/**
 * Decorator for documenting and validating the `imageURL` property in Pin questions.
 *
 * Applies:
 * - `@ApiProperty` for Swagger documentation.
 * - A validator for remote HTTP(S) URLs and local upload URLs.
 */
export function ApiQuestionPinImageUrlProperty(): PropertyDecorator {
  return applyDecorators(
    ApiProperty({
      title: 'Image URL',
      description: 'Public URL of the image used for pin placement.',
      example: 'https://example.com/question-image.png',
      required: true,
      format: 'url',
      type: String,
    }),
    Validate(SupportedQuestionMediaUrlConstraint, {
      message: 'The image URL must be a valid HTTP(S) URL.',
    }),
  )
}
