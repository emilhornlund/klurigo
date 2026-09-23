import { Param, ParseUUIDPipe } from '@nestjs/common'

/**
 * Decorator for validating and extracting the `playerId` path parameter.
 *
 * Applies:
 * - `@Param` to bind the path parameter.
 * - `@ParseUUIDPipe` to ensure the value is a valid UUID.
 */
export function RoutePlayerIdParam(): ParameterDecorator {
  return Param('playerID', ParseUUIDPipe)
}
