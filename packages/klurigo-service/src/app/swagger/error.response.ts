import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ValidationErrorResponse {
  @ApiProperty({
    description: 'The property that failed validation.',
    example: 'email',
  })
  property: string

  @ApiProperty({
    description: 'Validation constraint names and their messages.',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { isEmail: 'email must be an email' },
  })
  constraints: Record<string, string>
}

/** The error payload returned by the global AllExceptionsFilter. */
export class ErrorResponse {
  @ApiProperty({
    description: 'A human-readable description of the error.',
    example: 'Validation failed',
  })
  message: string

  @ApiProperty({
    description: 'The HTTP status code returned for the request.',
    example: 400,
  })
  status: number

  @ApiPropertyOptional({
    description:
      'Validation failures, when the error was caused by validation.',
    type: ValidationErrorResponse,
    isArray: true,
  })
  validationErrors?: ValidationErrorResponse[]

  @ApiProperty({
    description: 'The time at which the error response was created.',
    example: '2026-01-01T12:00:00.000Z',
    format: 'date-time',
  })
  timestamp: string
}
