import type {
  PaginatedQuizResponseDto,
  PublicUserProfileResponseDto,
} from '@klurigo/common'

import type { ApiClientCore } from '../api-client-core'
import { parseQueryParams } from '../api.utils'

/**
 * Side-effect hooks used by `createUserResource`.
 *
 * The user resource performs API calls only and delegates user feedback
 * (e.g. toast notifications) to injected callbacks.
 */
export type UserResourceDeps = {
  /**
   * Emits a success notification to the user.
   *
   * @param message - The user-facing message to display.
   */
  notifySuccess: (message: string) => void

  /**
   * Emits an error notification to the user.
   *
   * @param message - The user-facing message to display.
   */
  notifyError: (message: string) => void
}

/**
 * Query options supported by the public user quizzes endpoint.
 */
export type UserPublicQuizzesOptions = {
  readonly sort?: 'title' | 'created' | 'updated'
  readonly order?: 'asc' | 'desc'
  readonly limit: number
  readonly offset: number
}

/**
 * Public user API wrapper.
 *
 * This module groups authenticated public-user endpoints behind a stable
 * interface. User feedback is emitted via injected callbacks to keep the
 * resource stateless and testable.
 *
 * @param api - Shared API client core used for request execution.
 * @param deps - Side-effect callbacks for user notifications.
 * @returns An object containing public-user API functions.
 */
export const createUserResource = (
  api: ApiClientCore,
  deps: UserResourceDeps,
) => {
  /**
   * Retrieves the public profile summary for a specific user.
   *
   * @param userId - The ID of the user whose public profile should be loaded.
   * @returns A promise resolving to the public user profile response.
   */
  const getUserPublicProfile = (
    userId: string,
  ): Promise<PublicUserProfileResponseDto> =>
    api
      .apiGet<PublicUserProfileResponseDto>(`/users/${userId}/profile`)
      .catch((error) => {
        deps.notifyError(
          'We couldn’t load that user profile. Please try again.',
        )
        throw error
      })

  /**
   * Retrieves the public quizzes for a specific user.
   *
   * @param userId - The ID of the user whose public quizzes should be loaded.
   * @param options - Sorting and pagination options for the public quizzes list.
   * @returns A promise resolving to the existing paginated quiz response shape.
   */
  const getUserPublicQuizzes = (
    userId: string,
    options: UserPublicQuizzesOptions,
  ): Promise<PaginatedQuizResponseDto> =>
    api
      .apiGet<PaginatedQuizResponseDto>(
        `/users/${userId}/quizzes${parseQueryParams(options)}`,
      )
      .catch((error) => {
        deps.notifyError(
          'We couldn’t load this user’s public quizzes right now. Please try again.',
        )
        throw error
      })

  return {
    getUserPublicProfile,
    getUserPublicQuizzes,
  }
}
