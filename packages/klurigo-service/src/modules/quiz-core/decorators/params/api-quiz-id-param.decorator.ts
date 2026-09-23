import { applyDecorators } from '@nestjs/common'
import { ApiParam } from '@nestjs/swagger'

/**
 * Decorator for documenting the `quizId` path parameter.
 *
 * Applies:
 * - `@ApiParam` for Swagger documentation.
 */
export function ApiQuizIdParam(): MethodDecorator {
  return applyDecorators(
    ApiParam({
      name: 'quizId',
      description: 'The unique identifier of the quiz.',
      required: true,
      type: String,
      format: 'uuid',
      example: 'eaf37189-7aa7-455e-9e47-73db2a7d0a03',
    }),
  )
}
