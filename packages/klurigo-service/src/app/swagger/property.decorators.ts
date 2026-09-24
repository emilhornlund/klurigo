import {
  EMAIL_MAX_LENGTH,
  EMAIL_MIN_LENGTH,
  EMAIL_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PLAYER_NICKNAME_MAX_LENGTH,
  PLAYER_NICKNAME_MIN_LENGTH,
  PLAYER_NICKNAME_REGEX,
} from '@klurigo/common'
import { applyDecorators } from '@nestjs/common'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

type PropertyOptions = {
  title?: string
  description?: string
  example?: unknown
  name?: string
  default?: unknown
  readOnly?: boolean
  writeOnly?: boolean
  required?: boolean
}

function propertyMetadata(
  options: PropertyOptions,
  defaults: Record<string, unknown>,
): PropertyDecorator {
  const required = options.required ?? true
  const metadata = { ...defaults, ...options, required }

  return required ? ApiProperty(metadata) : ApiPropertyOptional(metadata)
}

/**
 * Decorator for documenting and validating a UUID identifier property.
 *
 * Applies:
 * - `@ApiProperty` or `@ApiPropertyOptional` for Swagger documentation.
 * - `@IsUUID` to validate the property as a UUID.
 */
export function ApiUuidProperty(
  options: PropertyOptions = {},
): PropertyDecorator {
  return applyDecorators(
    propertyMetadata(options, {
      title: 'Identifier',
      description: 'The unique identifier.',
      type: String,
      format: 'uuid',
      example: 'eaf37189-7aa7-455e-9e47-73db2a7d0a03',
    }),
    ...(options.required === false ? [IsOptional()] : []),
    IsUUID(),
  )
}

/**
 * Decorator for documenting and validating an ISO 8601 date-time property.
 *
 * Applies:
 * - `@ApiProperty` or `@ApiPropertyOptional` for Swagger documentation.
 * - `@IsDateString` to validate the property as a valid ISO 8601 date string.
 */
export function ApiDateTimeProperty(
  options: PropertyOptions & { message?: string } = {},
): PropertyDecorator {
  const { message, ...propertyOptions } = options

  return applyDecorators(
    propertyMetadata(propertyOptions, {
      title: 'Date and time',
      description: 'An ISO 8601 date and time.',
      type: Date,
      format: 'date-time',
      example: '2024-11-28T12:34:56.789Z',
    }),
    ...(propertyOptions.required === false ? [IsOptional()] : []),
    IsDateString({}, message ? { message } : undefined),
  )
}

/**
 * Decorator for documenting and validating an email address property.
 *
 * Applies:
 * - `@ApiProperty` or `@ApiPropertyOptional` for Swagger documentation.
 * - `@MinLength`, `@MaxLength`, and `@Matches` for the shared email rules.
 */
export function ApiEmailProperty(
  options: PropertyOptions & { message?: string } = {},
): PropertyDecorator {
  const { message, ...propertyOptions } = options

  return applyDecorators(
    propertyMetadata(propertyOptions, {
      title: 'Email',
      description: 'A valid email address.',
      type: String,
      format: 'email',
      minLength: EMAIL_MIN_LENGTH,
      maxLength: EMAIL_MAX_LENGTH,
      pattern: EMAIL_REGEX.source,
      example: 'user@example.com',
    }),
    ...(propertyOptions.required === false ? [IsOptional()] : []),
    MinLength(EMAIL_MIN_LENGTH),
    MaxLength(EMAIL_MAX_LENGTH),
    Matches(EMAIL_REGEX, {
      message: message ?? 'Email must be a valid address.',
    }),
  )
}

/**
 * Decorator for documenting and validating a password request property.
 *
 * Applies:
 * - `@ApiProperty` or `@ApiPropertyOptional` with the OpenAPI `password` format
 *   and `writeOnly` metadata.
 * - `@MinLength`, `@MaxLength`, and `@Matches` for the shared password rules.
 */
export function ApiPasswordProperty(
  options: PropertyOptions & { message?: string } = {},
): PropertyDecorator {
  const { message, ...propertyOptions } = options

  return applyDecorators(
    propertyMetadata(
      { ...propertyOptions, writeOnly: true },
      {
        title: 'Password',
        description: 'A password meeting the complexity requirements.',
        type: String,
        format: 'password',
        minLength: PASSWORD_MIN_LENGTH,
        maxLength: PASSWORD_MAX_LENGTH,
        pattern: PASSWORD_REGEX.source,
        example: 'Super#SecretPa$$w0rd123',
      },
    ),
    ...(propertyOptions.required === false ? [IsOptional()] : []),
    MinLength(PASSWORD_MIN_LENGTH),
    MaxLength(PASSWORD_MAX_LENGTH),
    Matches(PASSWORD_REGEX, {
      message:
        message ??
        'Password must include ≥2 uppercase, ≥2 lowercase, ≥2 digits, ≥2 symbols.',
    }),
  )
}

/**
 * Decorator for documenting and validating a player nickname property.
 *
 * Applies:
 * - `@ApiProperty` or `@ApiPropertyOptional` for Swagger documentation.
 * - `@MinLength`, `@MaxLength`, and `@Matches` for the shared nickname rules.
 * - `@IsString` when `validateString` is enabled by the consuming contract.
 */
export function ApiNicknameProperty(
  options: PropertyOptions & {
    validateString?: boolean
    message?: string
  } = {},
): PropertyDecorator {
  const { message, validateString, ...propertyOptions } = options

  return applyDecorators(
    propertyMetadata(propertyOptions, {
      title: 'Nickname',
      description:
        'A nickname chosen by the player, must be 2 to 20 characters long and contain only letters, numbers, or underscores.',
      type: String,
      minLength: PLAYER_NICKNAME_MIN_LENGTH,
      maxLength: PLAYER_NICKNAME_MAX_LENGTH,
      pattern: PLAYER_NICKNAME_REGEX.source,
      example: 'FrostyBear',
    }),
    ...(propertyOptions.required === false ? [IsOptional()] : []),
    ...(validateString ? [IsString()] : []),
    MinLength(PLAYER_NICKNAME_MIN_LENGTH),
    MaxLength(PLAYER_NICKNAME_MAX_LENGTH),
    Matches(PLAYER_NICKNAME_REGEX, {
      message:
        message ??
        'Nickname can only contain letters, numbers, and underscores.',
    }),
  )
}

/**
 * Decorator for documenting and validating an optional pagination `limit`.
 *
 * Applies:
 * - `@ApiPropertyOptional` for Swagger documentation.
 * - `@IsOptional`, `@IsInt`, `@Min`, `@Max`, and `@Type` for query validation.
 */
export function ApiPaginationLimitProperty(
  options: PropertyOptions = {},
): PropertyDecorator {
  const propertyOptions = { required: false, ...options }

  return applyDecorators(
    propertyMetadata(propertyOptions, {
      name: 'limit',
      description: 'The maximum number of results to retrieve per page.',
      type: Number,
      minimum: 5,
      maximum: 50,
      default: 10,
      example: 10,
    }),
    ...(propertyOptions.required === false ? [IsOptional()] : []),
    IsInt(),
    Min(5),
    Max(50),
    Type(() => Number),
  )
}

/**
 * Decorator for documenting and validating an optional pagination `offset`.
 *
 * Applies:
 * - `@ApiPropertyOptional` for Swagger documentation.
 * - `@IsOptional`, `@IsInt`, `@Min`, and `@Type` for query validation.
 */
export function ApiPaginationOffsetProperty(
  options: PropertyOptions = {},
): PropertyDecorator {
  const propertyOptions = { required: false, ...options }

  return applyDecorators(
    propertyMetadata(propertyOptions, {
      name: 'offset',
      description: 'The number of results to skip before starting retrieval.',
      type: Number,
      minimum: 0,
      default: 0,
      example: 0,
    }),
    ...(propertyOptions.required === false ? [IsOptional()] : []),
    IsInt(),
    Min(0),
    Type(() => Number),
  )
}
