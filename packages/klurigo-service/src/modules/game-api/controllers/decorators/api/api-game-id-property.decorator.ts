import type { ApiPropertyOptions } from '@nestjs/swagger'

import { ApiUuidProperty } from '../../../../../app/swagger'

/**
 * Decorator for documenting the `id` property of a game.
 *
 * Applies:
 * - `@ApiProperty` for Swagger documentation.
 * - `@IsUUID` to validate the value as a UUID.
 */
export function ApiGameIdProperty(
  options?: Pick<ApiPropertyOptions, 'description'>,
) {
  return ApiUuidProperty({
    title: 'ID',
    description: options?.description,
  })
}
