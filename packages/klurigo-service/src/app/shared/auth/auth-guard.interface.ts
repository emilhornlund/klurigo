import { TokenDto } from '@klurigo/common'
import type { Request } from 'express'

/**
 * Extended Express Request that includes authentication state populated by guards.
 *
 * This interface lives in the shared layer to avoid circular dependencies between
 * authentication decorators and guards.
 *
 * @typeParam T - The JWT payload type stored on the request (e.g. TokenDto, GameTokenDto).
 * @typeParam TUser - The user/principal type attached to the request, if any.
 */
export interface AuthGuardRequest<
  T extends TokenDto,
  TUser = unknown,
> extends Request {
  /**
   * The authenticated user record, populated when the request is authorized
   * in a scope that resolves a user.
   */
  user?: TUser

  /**
   * The verified JWT payload attached to the request by the authentication guard.
   */
  payload: T
}
