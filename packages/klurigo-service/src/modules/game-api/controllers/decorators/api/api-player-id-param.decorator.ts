import { applyDecorators } from '@nestjs/common'
import { ApiParam } from '@nestjs/swagger'

/**
 * Decorator for documenting the `playerID` path parameter.
 *
 * Applies:
 * - `@ApiParam` for Swagger documentation.
 */
export function ApiPlayerIDParam() {
  return applyDecorators(
    ApiParam({
      name: 'playerID',
      description: 'The unique identifier for the player.',
      required: true,
      format: 'uuid',
      type: String,
    }),
  )
}
