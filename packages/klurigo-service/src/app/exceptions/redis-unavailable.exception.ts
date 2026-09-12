import { ServiceUnavailableException } from '@nestjs/common'

/**
 * Indicates that a required Redis operation could not be completed.
 *
 * The operation and context are intentionally included in the message so the
 * API response is actionable without exposing the Redis error itself.
 */
export class RedisUnavailableException extends ServiceUnavailableException {
  constructor(operation: string, context: string, cause?: unknown) {
    super(`Redis unavailable while ${operation} for ${context}`, { cause })
  }
}
