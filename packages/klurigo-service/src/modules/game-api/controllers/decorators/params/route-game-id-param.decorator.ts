import { Param, ParseUUIDPipe } from '@nestjs/common'

/**
 * Decorator for validating and extracting the `gameID` path parameter.
 *
 * Applies:
 * - `@Param` to bind the path parameter.
 * - `@ParseUUIDPipe` to ensure the value is a valid UUID.
 */
export function RouteGameIdParam(): ParameterDecorator {
  return Param('gameID', new ParseUUIDPipe())
}
