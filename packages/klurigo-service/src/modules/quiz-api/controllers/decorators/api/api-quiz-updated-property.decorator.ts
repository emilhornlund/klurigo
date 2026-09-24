import { ApiDateTimeProperty } from '../../../../../app/swagger'

/**
 * Decorator for documenting and validating the `updated` property of a quiz.
 *
 * Applies:
 * - `@ApiProperty` for Swagger documentation.
 * - `@IsDateString` to validate the value as an ISO 8601 date string.
 */
export function ApiQuizUpdatedProperty(): PropertyDecorator {
  return ApiDateTimeProperty({
    title: 'Updated',
    description: 'The date and time when the quiz was last updated.',
    example: '2024-11-28T12:34:56.789Z',
    message: 'The updated date must be a valid ISO 8601 date string.',
  })
}
