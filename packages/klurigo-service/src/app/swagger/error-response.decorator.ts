import { applyDecorators } from '@nestjs/common'
import { ApiResponse, type ApiResponseOptions } from '@nestjs/swagger'

import { ErrorResponse } from './error.response'

type ErrorResponseOptions = Pick<ApiResponseOptions, 'description'>

const errorResponse = (
  status: number,
  defaultDescription: string,
  options?: ErrorResponseOptions,
) =>
  applyDecorators(
    ApiResponse({
      status,
      description: options?.description ?? defaultDescription,
      type: ErrorResponse,
    }),
  )

export const ApiBadRequestErrorResponse = (options?: ErrorResponseOptions) =>
  errorResponse(400, 'The request was invalid.', options)

export const ApiUnauthorizedErrorResponse = (options?: ErrorResponseOptions) =>
  errorResponse(401, 'Authentication is required or invalid.', options)

export const ApiForbiddenErrorResponse = (options?: ErrorResponseOptions) =>
  errorResponse(403, 'The authenticated client is not authorized.', options)

export const ApiNotFoundErrorResponse = (options?: ErrorResponseOptions) =>
  errorResponse(404, 'The requested resource was not found.', options)

export const ApiConflictErrorResponse = (options?: ErrorResponseOptions) =>
  errorResponse(
    409,
    'The request conflicts with the current resource state.',
    options,
  )

export const ApiUnprocessableEntityErrorResponse = (
  options?: ErrorResponseOptions,
) => errorResponse(422, 'The request could not be processed.', options)

export const ApiTooManyRequestsErrorResponse = (
  options?: ErrorResponseOptions,
) => errorResponse(429, 'Too many requests.', options)

export const ApiInternalServerErrorResponse = (
  options?: ErrorResponseOptions,
) => errorResponse(500, 'An internal server error occurred.', options)

export const ApiGoneErrorResponse = (options?: ErrorResponseOptions) =>
  errorResponse(410, 'The requested resource is no longer available.', options)

export const ApiServiceUnavailableErrorResponse = (
  options?: ErrorResponseOptions,
) => errorResponse(503, 'The service is temporarily unavailable.', options)
