import { applyDecorators } from '@nestjs/common'
import { ApiParam } from '@nestjs/swagger'

/**
 * Decorator for documenting the `gameID` path parameter.
 *
 * Applies:
 * - `@ApiParam` for Swagger documentation.
 */
export function ApiGameIdParam(): MethodDecorator {
  return applyDecorators(
    ApiParam({
      name: 'gameID',
      description: 'The unique identifier for the game.',
      required: true,
      format: 'uuid',
      type: String,
    }),
  )
}
