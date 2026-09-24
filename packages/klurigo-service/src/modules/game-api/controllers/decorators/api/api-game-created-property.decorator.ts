import { ApiDateTimeProperty } from '../../../../../app/swagger'

/**
 * Decorator for documenting and validating the `created` property.
 *
 * Applies:
 * - `@ApiProperty` for Swagger documentation.
 * - `@IsDateString` to validate the property as a valid ISO 8601 date string.
 */
export function ApiGameCreatedProperty(): PropertyDecorator {
  return ApiDateTimeProperty({
    title: 'Created',
    description: 'The date and time when the game was created.',
    example: '2024-11-28T12:34:56.789Z',
    message: 'The created date must be a valid ISO 8601 date string.',
  })
}
