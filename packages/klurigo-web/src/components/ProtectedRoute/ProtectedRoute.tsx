import { TokenScope } from '@klurigo/common'
import type { FC, ReactNode } from 'react'
import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuthContext } from '../../context/auth'

/**
 * Props for the ProtectedRoute component which guards access to a route
 * based on the user’s authentication state in a given scope.
 *
 * @property scope - Which TokenScope to check (TokenScope.User or TokenScope.Game). Defaults to User.
 * @property authenticated  - If true, the route is only accessible when authenticated;
 *                            if false, it’s only accessible when _not_ authenticated. Defaults to true.
 * @property children - The React elements to render when access is allowed.
 */
export interface ProtectedRouteProps {
  scope?: TokenScope
  authenticated?: boolean
  children: ReactNode
}

/**
 * Conditionally renders the given children or redirects to the root path,
 * based on whether the user meets the authentication requirements.
 *
 * @param scope - The TokenScope to validate (defaults to TokenScope.User).
 * @param authenticated - Whether the route requires being authenticated (defaults to true).
 * @param children - The component(s) to render when access is permitted.
 * @returns The children if allowed, otherwise a <Navigate> to "/".
 */
const ProtectedRoute: FC<ProtectedRouteProps> = ({
  scope = TokenScope.User,
  authenticated = true,
  children,
}) => {
  /**
   * Retrieve the current authentication flags for User and Game scopes
   * from our AuthContext.
   */
  const { isUserAuthenticated, isUserRecoveryPending, isGameAuthenticated } =
    useAuthContext()

  /**
   * Determine whether we should redirect away from this route.
   *
   * - If `authenticated` is true, we redirect when the user is _not_ allowed.
   * - If `authenticated` is false, we redirect when the user _is_ allowed.
   */
  const shouldRedirect = useMemo(() => {
    const isAllowed =
      (scope === TokenScope.Game && isGameAuthenticated) ||
      (scope === TokenScope.User && isUserAuthenticated)
    return authenticated ? !isAllowed : isAllowed
  }, [scope, authenticated, isUserAuthenticated, isGameAuthenticated])

  if (
    shouldRedirect &&
    !(scope === TokenScope.User && authenticated && isUserRecoveryPending)
  ) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
