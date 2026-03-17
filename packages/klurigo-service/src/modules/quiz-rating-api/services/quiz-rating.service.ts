import { PaginatedQuizRatingDto, QuizRatingDto } from '@klurigo/common'
import { Injectable, Logger } from '@nestjs/common'
import { MurLock } from 'murlock'

import { QuizRepository } from '../../quiz-core/repositories'
import { QuizRatingRepository } from '../../quiz-core/repositories'
import {
  QuizRating,
  QuizRatingAnonymousAuthorWithBase,
  type QuizRatingAuthor,
  QuizRatingUserAuthorWithBase,
} from '../../quiz-core/repositories/models/schemas'
import {
  isQuizRatingAnonymousAuthor,
  isQuizRatingUserAuthor,
} from '../../quiz-core/utils'
import { User } from '../../user/repositories'
import { QuizRatingByQuizAndAuthorNotFoundException } from '../exceptions'
import { updateQuizRatingSummary } from '../utils'

/**
 * Service for managing quiz ratings and feedback.
 *
 * Supports:
 * - Retrieving ratings with pagination for quiz pages.
 * - Retrieving a user's rating for a quiz.
 * - Creating or updating a user's rating for a quiz.
 * - Updating the quiz's aggregated rating summary for fast reads.
 */
@Injectable()
export class QuizRatingService {
  /**
   * Creates a `QuizRatingService`.
   *
   * @param quizRepository - Repository for quiz persistence and updates.
   * @param quizRatingRepository - Repository for rating persistence and queries.
   * @param logger - Logger instance scoped to this service.
   */
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly quizRatingRepository: QuizRatingRepository,
    private readonly logger: Logger = new Logger(QuizRatingService.name),
  ) {}

  /**
   * Retrieves the rating left by a specific authenticated user for a specific quiz.
   *
   * @param quizId - The quiz identifier.
   * @param author - The user (author) whose rating should be retrieved.
   * @returns The rating DTO.
   * @throws QuizRatingByQuizAndAuthorNotFoundException when no rating exists for the quiz and author.
   */
  public async findQuizRatingByQuizIdAndAuthor(
    quizId: string,
    author: User,
  ): Promise<QuizRatingDto> {
    const result = await this.quizRatingRepository.findQuizRatingByUserAuthor(
      quizId,
      author._id,
    )

    if (!result) {
      throw new QuizRatingByQuizAndAuthorNotFoundException(quizId, author._id)
    }

    return QuizRatingService.toQuizRatingDto(result)
  }

  /**
   * Retrieves ratings for a quiz with pagination and sorting.
   *
   * @param quizId - The quiz identifier.
   * @param options - Pagination and sorting options.
   * @returns Paginated rating DTOs.
   */
  public async findQuizRatingsWithPagination(
    quizId: string,
    options: {
      offset?: number
      limit?: number
      sort?: {
        field?: 'created' | 'updated'
        order?: 'asc' | 'desc'
      }
      commentsOnly?: boolean
    },
  ): Promise<PaginatedQuizRatingDto> {
    this.logger.debug(`Find quiz ratings for ${quizId}`)

    const { results, total, limit, offset } =
      await this.quizRatingRepository.findQuizRatingsWithPagination(
        quizId,
        options,
      )

    this.logger.debug(`Found ${total} quiz ratings for ${quizId}`)

    return {
      results: results.map(QuizRatingService.toQuizRatingDto),
      total,
      limit,
      offset,
    }
  }

  /**
   * Creates or updates an author's rating for a quiz.
   *
   * If a rating already exists for `(quizId, author)`, it will be updated.
   * Otherwise, a new rating document is created.
   *
   * The quiz's `ratingSummary` is updated accordingly.
   *
   * Supports both authenticated users ({@link QuizRatingAuthorType.User}) and
   * anonymous game participants ({@link QuizRatingAuthorType.Anonymous}). The
   * correct repository lookup is selected based on the author type.
   *
   * @param quizId - The quiz identifier.
   * @param author - The rating author subdocument (user or anonymous participant).
   * @param stars - Star rating value (1–5).
   * @param comment - Optional feedback comment.
   * @returns The resulting rating DTO.
   */
  @MurLock(5000, 'quiz_rating', 'quizId')
  public async createOrUpdateQuizRating(
    quizId: string,
    author: QuizRatingAuthor,
    stars: number,
    comment?: string,
  ): Promise<QuizRatingDto> {
    const existingQuiz = await this.quizRepository.findQuizByIdOrThrow(quizId)

    let existingQuizRating: QuizRating | null
    let authorId: string

    if (isQuizRatingUserAuthor(author)) {
      const userAuthor = author as QuizRatingUserAuthorWithBase
      existingQuizRating =
        await this.quizRatingRepository.findQuizRatingByUserAuthor(
          quizId,
          userAuthor.user._id,
        )
      authorId = userAuthor.user._id
    } else if (isQuizRatingAnonymousAuthor(author)) {
      const anonAuthor = author as QuizRatingAnonymousAuthorWithBase
      existingQuizRating =
        await this.quizRatingRepository.findQuizRatingByAnonymousAuthor(
          quizId,
          anonAuthor.participantId,
        )
      authorId = anonAuthor.participantId
    } else {
      throw new Error('Unknown author type')
    }

    const previousStars = existingQuizRating?.stars
    const previousComment = existingQuizRating?.comment

    const now = new Date()

    const result: QuizRating | null = existingQuizRating
      ? await this.quizRatingRepository.updateQuizRating(
          existingQuizRating._id,
          now,
          stars,
          comment,
        )
      : await this.quizRatingRepository.createQuizRating(
          quizId,
          author,
          now,
          stars,
          comment,
        )

    if (!result) {
      throw new QuizRatingByQuizAndAuthorNotFoundException(quizId, authorId)
    }

    const ratingSummary = updateQuizRatingSummary({
      summary: existingQuiz.ratingSummary,
      previousStars,
      nextStars: stars,
      previousComment,
      nextComment: comment,
      updatedAt: now,
    })

    await this.quizRepository.replaceQuiz(quizId, {
      ...existingQuiz,
      ratingSummary,
    })

    return QuizRatingService.toQuizRatingDto(result)
  }

  /**
   * Maps a rating persistence model to a public DTO.
   *
   * Resolves the author identity from the discriminated author subdocument.
   * For user-authored ratings, the author nickname is resolved from the
   * populated User document. For anonymous ratings, the stored nickname is used.
   *
   * @param quizRating - The rating document.
   * @returns The mapped DTO.
   */
  private static toQuizRatingDto(quizRating: QuizRating): QuizRatingDto {
    return {
      id: quizRating._id,
      quizId: quizRating.quizId,
      stars: quizRating.stars,
      comment: quizRating.comment,
      author: QuizRatingService.toQuizRatingAuthorDto(quizRating.author),
      createdAt: quizRating.created,
      updatedAt: quizRating.updated,
    }
  }

  /**
   * Maps a discriminated author subdocument to the public author DTO shape.
   *
   * The external shape `{ id, nickname }` is the same for both user and
   * anonymous authors — consumers do not need to know the author type.
   *
   * For user authors, the nickname is resolved from the populated User document.
   * For anonymous authors, the nickname stored at rating time is used directly.
   *
   * @param author - The discriminated author subdocument.
   * @returns The mapped author DTO.
   */
  private static toQuizRatingAuthorDto(author: QuizRatingAuthor): {
    id: string
    nickname: string
  } {
    if (isQuizRatingUserAuthor(author)) {
      return { id: author.user._id, nickname: author.user.defaultNickname }
    } else if (isQuizRatingAnonymousAuthor(author)) {
      return { id: author.participantId, nickname: author.nickname }
    } else {
      throw new Error('Unknown author')
    }
  }
}
