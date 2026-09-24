import { ApiNicknameProperty } from '../../../../../app/swagger'

/**
 * Decorator for documenting and validating the `nickname` property of a player.
 *
 * Applies:
 * - `@ApiProperty` for Swagger documentation.
 * - `@IsString` to ensure the value is a string.
 * - `@MinLength` to enforce the minimum length.
 * - `@MaxLength` to enforce the maximum length.
 * - `@Matches` to enforce the regex pattern.
 */
export function ApiPlayerNicknameProperty() {
  return ApiNicknameProperty({
    title: 'Nickname',
    description:
      'A nickname chosen by the player, must be 2 to 20 characters long and contain only letters, numbers, or underscores.',
    example: 'FrostyBear',
    validateString: true,
  })
}
