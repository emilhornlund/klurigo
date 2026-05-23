import { applyDecorators } from '@nestjs/common'
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

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
  return applyDecorators(
    ApiProperty({
      title: 'ID',
      description: options?.description,
      required: true,
      format: 'uuid',
      type: String,
    }),
    IsUUID(),
  )
}
