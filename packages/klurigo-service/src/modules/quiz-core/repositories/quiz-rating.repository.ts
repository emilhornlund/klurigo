import { QuizRatingAuthorType } from '@klurigo/common'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { QueryFilter } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

import { BaseRepository, buildSortObject } from '../../../app/shared/repository'
import { User } from '../../user/repositories'

import {
  QuizRating,
  QuizRatingAuthor,
  type QuizRatingModel,
  type QuizRatingUserAuthorWithBase,
} from './models/schemas'

/**
 * Populate configuration for resolving the User reference inside a
 * discriminated USER-type author subdocument.
 */
const POPULATE_AUTHOR_USER = { path: 'author.user', model: 'User' } as const

/**
 * Repository for managing quiz rating documents.
 *
 * Provides persistence operations for creating, updating, and listing ratings,
 * including pagination and sorting for quiz feedback feeds.
 */
@Injectable()
export class QuizRatingRepository extends BaseRepository<QuizRating> {
  /**
   * Creates a `QuizRatingRepository`.
   *
   * @param quizRatingModel - The Mongoose model for the QuizRating schema.
   */
  constructor(
    @InjectModel(QuizRating.name)
    protected readonly quizRatingModel: QuizRatingModel,
  ) {
    super(quizRatingModel, 'QuizRating')
  }

  /**
   * Finds an authenticated user's rating for a specific quiz.
   *
   * Resolves the author's User reference so the returned document is
   * compatible with DTO mapping (which reads `author.user._id` and
   * `author.user.defaultNickname`).
   *
   * @param quizId - The quiz identifier.
   * @param userId - The ID of the user who created the rating.
   * @returns The rating with populated author if found, otherwise `null`.
   */
  public async findQuizRatingByUserAuthor(
    quizId: string,
    userId: string,
  ): Promise<QuizRating | null> {
    const doc = await this.quizRatingModel
      .findOne({
        quizId,
        'author.type': QuizRatingAuthorType.User,
        'author.user': userId,
      })
      .lean<QuizRating>()
      .exec()

    if (!doc) return null

    const [resolved] = await this.resolveUserAuthors([doc])
    return resolved
  }

  /**
   * Finds an anonymous participant's rating for a specific quiz.
   *
   * Anonymous ratings store all necessary author data inline, so no
   * User reference resolution is needed.
   *
   * @param quizId - The quiz identifier.
   * @param participantId - The game-session participant UUID used as the author identifier.
   * @returns The rating document if found, otherwise `null`.
   */
  public async findQuizRatingByAnonymousAuthor(
    quizId: string,
    participantId: string,
  ): Promise<QuizRating | null> {
    return this.quizRatingModel
      .findOne({
        quizId,
        'author.type': QuizRatingAuthorType.Anonymous,
        'author.participantId': participantId,
      })
      .lean<QuizRating>()
      .exec()
  }

  /**
   * Finds ratings for a quiz with pagination and sorting.
   *
   * Mongoose cannot populate refs nested inside discriminated subdocument
   * schemas, so USER-type author references are resolved manually via a
   * batch User lookup. The query uses `.lean()` to return plain objects
   * that can be freely modified during resolution.
   *
   * @param quizId - The quiz identifier.
   * @param options - Pagination and sorting options.
   * @returns A paginated result containing rating documents and metadata.
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
      /**
       * When true, only ratings that include a non-empty comment are returned.
       * Useful for a "Latest feedback" feed.
       */
      commentsOnly?: boolean
    },
  ): Promise<{
    results: QuizRating[]
    total: number
    limit: number
    offset: number
  }> {
    const filter: QueryFilter<QuizRating> = {
      quizId,
      ...(options.commentsOnly ? { comment: { $exists: true, $ne: '' } } : {}),
    }

    const sort = buildSortObject({
      field: options?.sort?.field ?? 'updated',
      direction: (options?.sort?.order ?? 'asc') === 'asc' ? 1 : -1,
    })

    const findOptions = {
      skip: options?.offset ?? 0,
      limit: options?.limit ?? 5,
      sort,
    }

    const [leanDocs, total] = await Promise.all([
      this.quizRatingModel
        .find(filter)
        .skip(findOptions.skip)
        .limit(findOptions.limit)
        .sort(findOptions.sort)
        .lean<QuizRating[]>()
        .exec(),
      this.quizRatingModel.countDocuments(filter),
    ])

    const results = await this.resolveUserAuthors(leanDocs)

    return {
      results,
      total,
      limit: findOptions.limit,
      offset: findOptions.skip,
    }
  }

  /**
   * Creates a new rating document for a quiz.
   *
   * Note: uniqueness is enforced by partial unique indexes on the author type.
   *
   * @param quizId - The quiz identifier.
   * @param author - The rating author subdocument.
   * @param now - Timestamp used for both `created` and `updated`.
   * @param stars - Star rating value (1–5).
   * @param comment - Optional feedback comment.
   * @returns The created rating document.
   */
  public async createQuizRating(
    quizId: string,
    author: QuizRatingAuthor,
    now: Date,
    stars: number,
    comment?: string,
  ): Promise<QuizRating> {
    const id = uuidv4()
    await this.create({
      _id: id,
      quizId,
      author,
      stars,
      comment,
      created: now,
      updated: now,
    })
    const doc = await this.quizRatingModel
      .findById(id)
      .populate(POPULATE_AUTHOR_USER)
    return doc!.toObject() as QuizRating
  }

  /**
   * Updates an existing rating document.
   *
   * @param quizRatingId - The rating identifier.
   * @param now - Timestamp used for the new `updated` value.
   * @param stars - Updated star rating value (1–5).
   * @param comment - Updated feedback comment.
   * @returns The updated rating document.
   * @throws QuizRatingNotFoundException when the rating does not exist.
   */
  public async updateQuizRating(
    quizRatingId: string,
    now: Date,
    stars: number,
    comment?: string,
  ): Promise<QuizRating | null> {
    return this.update(
      quizRatingId,
      { stars, comment, updated: now },
      { populate: POPULATE_AUTHOR_USER },
    )
  }

  /**
   * Resolves User references for USER-type authors in lean rating documents.
   *
   * Mongoose cannot populate refs nested inside discriminated subdocument
   * schemas. This method performs an explicit batch lookup of the referenced
   * User documents and assigns the resolved objects back onto the lean
   * documents so that downstream DTO mapping can read `author.user._id`
   * and `author.user.defaultNickname`.
   *
   * @param docs - Lean rating documents whose USER-type author refs may be
   *               unresolved string ids.
   * @returns The same array with USER-type author refs replaced by User objects.
   */
  private async resolveUserAuthors(docs: QuizRating[]): Promise<QuizRating[]> {
    const userIds = docs
      .filter(
        (doc) =>
          doc.author?.type === QuizRatingAuthorType.User &&
          typeof ((doc.author as QuizRatingUserAuthorWithBase)
            .user as unknown) === 'string',
      )
      .map(
        (doc) =>
          (doc.author as QuizRatingUserAuthorWithBase)
            .user as unknown as string,
      )

    if (userIds.length === 0) return docs

    const userModel = this.quizRatingModel.db.model<User>('User')
    const users = await userModel
      .find({ _id: { $in: userIds } })
      .lean()
      .exec()
    const userMap = new Map(users.map((u) => [String(u._id), u]))

    for (const doc of docs) {
      if (doc.author?.type !== QuizRatingAuthorType.User) continue

      // In lean documents the user ref is an unresolved string ID, but the
      // TypeScript type declares it as `User`. Cast via `unknown` so the
      // runtime check compiles.
      const author = doc.author as QuizRatingUserAuthorWithBase
      const userRef = author.user as unknown
      if (typeof userRef === 'string') {
        ;(author as { user: unknown }).user = userMap.get(userRef) ?? userRef
      }
    }

    return docs
  }
}
