import { applyDecorators } from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'
import { Validate } from 'class-validator'

import { SupportedQuestionMediaUrlConstraint } from './is-supported-question-media-url'

/**
 * Decorator for documenting and validating the `url` property of a question's media.
 *
 * Applies:
 * - `@ApiProperty` for Swagger documentation.
     * - A validator for remote HTTP(S) URLs and local upload URLs.
 */
export function ApiQuestionMediaUrlProperty(): PropertyDecorator {
  return applyDecorators(
    ApiProperty({
      title: 'Media URL',
      description: 'The URL of the media. Must be a valid URL.',
      example: 'https://example.com/question-image.png',
      required: true,
      format: 'url',
      type: String,
    }),
    Validate(SupportedQuestionMediaUrlConstraint, {
      message: 'The media URL must be a valid HTTP(S) URL.',
    }),
  )
}
