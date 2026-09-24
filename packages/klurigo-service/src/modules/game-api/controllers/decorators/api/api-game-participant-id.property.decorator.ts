import { ApiUuidProperty } from '../../../../../app/swagger'

/**
 * Decorator for documenting and validating the `id` property of a participant.
 *
 * Applies:
 * - `@ApiProperty` for Swagger documentation.
 * - `@IsUUID` to validate the value as a UUID.
 */
export function ApiGameParticipantIdProperty() {
  return ApiUuidProperty({
    title: 'ID',
    description: 'The unique identifier of the participant.',
  })
}
