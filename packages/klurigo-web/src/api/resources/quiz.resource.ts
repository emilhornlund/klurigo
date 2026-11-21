import {
  type DiscoveryResponseDto,
  type DiscoverySectionKey,
  type DiscoverySectionPageResponseDto,
  type GameMode,
  type LanguageCode,
  type PaginatedQuizRatingDto,
  type PaginatedQuizResponseDto,
  type QuestionDto,
  type QuestionPreviewDto,
  type QuizCategory,
  type QuizRatingDto,
  type QuizRequestDto,
  type QuizResponseDto,
  type QuizVisibility,
} from '@klurigo/common'

import type { ApiClientCore } from '../api-client-core'
import { parseQueryParams } from '../api.utils'

/**
 * Side-effect hooks used by `createQuizResource`.
 *
 * The quiz resource performs API calls only and delegates user feedback (e.g. toast notifications)
 * to injected callbacks.
 */
export type QuizResourceDeps = {
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
 * Quiz API wrapper.
 *
 * This module groups quiz-related HTTP calls behind a stable interface.
 * User feedback is emitted via injected callbacks to keep the resource stateless and testable.
 *
 * @param api - Shared API client core used for request execution.
 * @param deps - Side-effect callbacks for user notifications.
 * @returns An object containing quiz-related API functions.
 */
export const createQuizResource = (
  api: ApiClientCore,
  deps: QuizResourceDeps,
) => {
  /**
   * Retrieves the quizzes associated with the current user.
   *
   * Supports optional filtering by search term, mode, visibility, category, and language,
   * as well as sorting and pagination.
   *
   * @param options - Query options controlling filtering, sorting, and pagination.
   * @returns A promise resolving to the quizzes in a paginated format as a `PaginatedQuizResponseDto`.
   */
  const getProfileQuizzes = (options: {
    search?: string
    mode?: GameMode
    visibility?: QuizVisibility
    category?: QuizCategory
    languageCode?: LanguageCode
    sort?: 'title' | 'created' | 'updated'
    order?: 'asc' | 'desc'
    limit: number
    offset: number
  }): Promise<PaginatedQuizResponseDto> =>
    api
      .apiGet<PaginatedQuizResponseDto>(
        `/profile/quizzes${parseQueryParams(options)}`,
      )
      .catch((error) => {
        deps.notifyError(
          'We couldn’t load your quizzes right now. Please try again.',
        )
        throw error
      })

  /**
   * Retrieves a paginated list of public quizzes.
   *
   * Supports optional filtering by search term, mode, category, and language,
   * as well as sorting and pagination.
   *
   * @param options - Query options controlling filtering, sorting, and pagination.
   * @returns A promise resolving to public quizzes in a paginated format.
   */
  const getPublicQuizzes = (options: {
    search?: string
    mode?: GameMode
    category?: QuizCategory
    languageCode?: LanguageCode
    sort?: 'title' | 'created' | 'updated'
    order?: 'asc' | 'desc'
    limit: number
    offset: number
  }): Promise<PaginatedQuizResponseDto> =>
    api
      .apiGet<PaginatedQuizResponseDto>(`/quizzes${parseQueryParams(options)}`)
      .catch((error) => {
        deps.notifyError(
          'We couldn\u2019t load public quizzes right now. Please try again.',
        )
        throw error
      })

  /**
   * Creates a new quiz with the specified request data.
   *
   * @param request - The request data for creating a new quiz.
   *
   * @returns A promise resolving to the created quiz details as a `QuizResponseDto`.
   */
  const createQuiz = (request: QuizRequestDto): Promise<QuizResponseDto> =>
    api
      .apiPost<QuizResponseDto>('/quizzes', request)
      .then((response) => {
        deps.notifySuccess(
          'Success! Your quiz has been created and is ready to go!',
        )
        return response
      })
      .catch((error) => {
        deps.notifyError('Quiz creation failed. Please try again.')
        throw error
      })

  /**
   * Retrieves the details of a specific quiz by its ID.
   *
   * @param quizId - The ID of the quiz to retrieve.
   *
   * @returns A promise resolving to the quiz details as a `QuizResponseDto`.
   */
  const getQuiz = (quizId: string): Promise<QuizResponseDto> =>
    api.apiGet<QuizResponseDto>(`/quizzes/${quizId}`).catch((error) => {
      deps.notifyError('We couldn’t load that quiz. Please try again.')
      throw error
    })

  /**
   * Updates an existing quiz with the specified request data.
   *
   * @param quizId - The ID of the quiz to update.
   * @param request - The request data for updating the quiz.
   *
   * @returns A promise resolving to the updated quiz details as a `QuizResponseDto`.
   */
  const updateQuiz = (
    quizId: string,
    request: QuizRequestDto,
  ): Promise<QuizResponseDto> =>
    api
      .apiPut<QuizResponseDto>(`/quizzes/${quizId}`, request)
      .then((response) => {
        deps.notifySuccess(
          'Success! Your quiz has been saved and is ready to go!',
        )
        return response
      })
      .catch((error) => {
        deps.notifyError('Saving your quiz failed. Please try again.')
        throw error
      })

  /**
   * Deletes a quiz by its ID.
   *
   * @param quizId - The ID of the quiz to delete.
   *
   * @returns A promise that resolves when the quiz has been successfully deleted.
   */
  const deleteQuiz = (quizId: string): Promise<void> =>
    api
      .apiDelete<void>(`/quizzes/${quizId}`)
      .then(() => {
        deps.notifySuccess('Success! The quiz has been deleted successfully.')
      })
      .catch((error) => {
        deps.notifyError(
          'We couldn’t delete that quiz right now. Please try again.',
        )
        throw error
      })

  /**
   * Retrieves the list of questions for a specific quiz.
   *
   * @param quizId - The ID of the quiz to retrieve questions for.
   * @returns A promise that resolves to an array of quiz questions.
   */
  const getQuizQuestions = (quizId: string): Promise<QuestionDto[]> =>
    api.apiGet<QuestionDto[]>(`/quizzes/${quizId}/questions`).catch((error) => {
      deps.notifyError('We couldn’t load the quiz questions. Please try again.')
      throw error
    })

  /** Retrieves sample question prompts; the details page handles errors inline. */
  const getQuizQuestionPreviews = (
    quizId: string,
  ): Promise<QuestionPreviewDto[]> =>
    api.apiGet<QuestionPreviewDto[]>(`/quizzes/${quizId}/questions/preview`)

  /**
   * Retrieves a paginated list of ratings for a specific quiz.
   *
   * Supports sorting, ordering, pagination, and filtering to only include ratings
   * that contain written comments.
   *
   * @param quizId - The ID of the quiz to retrieve ratings for.
   * @param options - Query options controlling sorting, pagination, and filtering.
   * @param options.sort - Field to sort ratings by (`created` or `updated`).
   * @param options.order - Sort order (`asc` or `desc`).
   * @param options.limit - Maximum number of ratings to retrieve per page.
   * @param options.offset - Number of ratings to skip before starting retrieval.
   * @param options.commentsOnly - When true, only ratings with comments are returned.
   *
   * @returns A promise resolving to a paginated list of quiz ratings.
   */
  const getQuizRatings = (
    quizId: string,
    options?: {
      sort?: 'updated' | 'created'
      order?: 'asc' | 'desc'
      limit?: number
      offset?: number
      commentsOnly?: boolean
    },
  ): Promise<PaginatedQuizRatingDto> =>
    api
      .apiGet<PaginatedQuizRatingDto>(
        `/quizzes/${quizId}/ratings${parseQueryParams(options)}`,
      )
      .catch((error) => {
        deps.notifyError(
          'We couldn’t load quiz ratings right now. Please try again.',
        )
        throw error
      })

  /**
   * Creates or updates the current user's rating for a quiz.
   *
   * If the user has already rated the quiz, the existing rating is updated.
   * Otherwise, a new rating is created.
   *
   * @param quizId - The ID of the quiz being rated.
   * @param stars - The star rating value (1–5).
   * @param comment - Optional free-text feedback about the quiz.
   *
   * @returns A promise resolving to the created or updated quiz rating.
   */
  const createOrUpdateQuizRating = (
    quizId: string,
    stars: number,
    comment?: string,
  ): Promise<QuizRatingDto> =>
    api
      .apiPut<QuizRatingDto>(`/profile/quizzes/${quizId}/ratings`, {
        stars,
        comment,
      })
      .catch((error) => {
        deps.notifyError(
          'We couldn’t save your rating right now. Please try again.',
        )
        throw error
      })

  /**
   * Retrieves the discovery page payload containing all curated rails.
   *
   * Calls `GET /discover` and returns the full set of discovery sections
   * with their preview quiz cards.
   *
   * @returns A promise resolving to the discovery response as a `DiscoveryResponseDto`.
   */
  const getDiscovery = (): Promise<DiscoveryResponseDto> =>
    api.apiGet<DiscoveryResponseDto>('/discover').catch((error) => {
      deps.notifyError(
        'We couldn\u2019t load discovery right now. Please try again.',
      )
      throw error
    })

  /**
   * Retrieves a paginated page of quizzes for a specific discovery section.
   *
   * Calls GET /discover/section/:key with limit and offset as query params.
   * The response includes a snapshotTotal field that reflects the number of
   * scored entries stored in the snapshot for this rail — bounded by snapshot
   * capacity constants, not a live database row count. Use snapshotTotal to
   * determine whether more results are available for "Load more" pagination.
   *
   * @param key - The discovery section key identifying the rail.
   * @param options.limit - Maximum number of quiz cards to retrieve per page.
   * @param options.offset - Zero-based index of the first item to retrieve.
   * @returns A promise resolving to a DiscoverySectionPageResponseDto.
   */
  const getSectionQuizzes = (
    key: DiscoverySectionKey,
    options: { limit: number; offset: number },
  ): Promise<DiscoverySectionPageResponseDto> =>
    api
      .apiGet<DiscoverySectionPageResponseDto>(
        `/discover/section/${key}${parseQueryParams(options)}`,
      )
      .catch((error) => {
        deps.notifyError(
          'We couldn\u2019t load this section right now. Please try again.',
        )
        throw error
      })

  return {
    getPublicQuizzes,
    getProfileQuizzes,
    createQuiz,
    getQuiz,
    updateQuiz,
    deleteQuiz,
    getQuizQuestions,
    getQuizQuestionPreviews,
    getQuizRatings,
    createOrUpdateQuizRating,
    getDiscovery,
    getSectionQuizzes,
  }
}
