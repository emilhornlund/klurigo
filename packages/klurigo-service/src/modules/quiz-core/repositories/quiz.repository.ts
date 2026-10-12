import { QuizVisibility } from '@klurigo/common'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { QueryFilter } from 'mongoose'
import { MurLock } from 'murlock'

import {
  BaseRepository,
  buildSortObject,
  SortOptions,
} from '../../../app/shared/repository'
import { QuizNotFoundException } from '../exceptions'

import { Quiz, type QuizModel } from './models/schemas'

const IMAGE_CLEANUP_LOCK = 'orphaned_image_cleanup_lock'

/** Converts a managed upload URL or relative upload path to its disk identifier. */
export function normalizeUploadedImageReference(
  value: unknown,
): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined

  let pathname = value.trim()
  const isAbsoluteUrl =
    /^[a-z][a-z0-9+.-]*:\/\//i.test(pathname) || pathname.startsWith('//')
  try {
    pathname = new URL(pathname, 'http://klurigo.local').pathname
  } catch {
    return undefined
  }
  if (isAbsoluteUrl && !pathname.startsWith('/uploads/images/')) {
    return undefined
  }

  try {
    pathname = decodeURIComponent(pathname).replace(/^\/+/, '')
  } catch {
    return undefined
  }
  const match = pathname.match(
    /^(?:uploads\/images\/)?([A-Za-z0-9_-]+)\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.webp$/i,
  )
  return match ? `${match[1]}/${match[2]}.webp` : undefined
}

/**
 * Repository for accessing and manipulating quiz data.
 *
 * Extends BaseRepository to provide common CRUD operations and adds quiz-specific methods.
 */
@Injectable()
export class QuizRepository extends BaseRepository<Quiz> {
  /**
   * Creates an instance of QuizRepository.
   *
   * @param quizModel - The Mongoose model for the Quiz schema.
   */
  constructor(@InjectModel(Quiz.name) protected readonly quizModel: QuizModel) {
    super(quizModel, 'Quiz')
  }

  /**
   * Finds a quiz document by its ID or throws an exception if not found.
   *
   * @param quizId - The unique identifier of the quiz.
   *
   * @returns The found quiz document.
   *
   * @throws QuizNotFoundException If no quiz is found with the given ID.
   */
  public async findQuizByIdOrThrow(quizId: string): Promise<Quiz> {
    const document = await this.quizModel.findById(quizId).populate('owner')

    if (!document) {
      throw new QuizNotFoundException(quizId)
    }

    return document
  }

  /**
   * Counts quizzes that match the provided filter.
   *
   * @param filter - The Mongoose filter query to apply.
   *
   * @returns The total number of quizzes that match the filter.
   */
  public async countQuizzes(filter: QueryFilter<Quiz>): Promise<number> {
    return this.count(filter)
  }

  /**
   * Counts public quizzes owned by the given user.
   *
   * @param ownerId - The user identifier stored in the quiz owner field.
   *
   * @returns The number of public quizzes authored by the user.
   */
  public async countPublicQuizzesByOwnerId(ownerId: string): Promise<number> {
    return this.count({
      owner: ownerId as never,
      visibility: QuizVisibility.Public,
    })
  }

  /**
   * Finds quizzes using filter, sorting, pagination.
   *
   * @param filter - Filter criteria for matching quizzes.
   * @param sortField - Field by which to sort the results. Defaults to 'created'.
   * @param sortOrder - Sort order ('asc' | 'desc'). Defaults to 'desc'.
   * @param limit - Max number of quizzes to retrieve. Defaults to 10.
   * @param offset - Number of quizzes to skip for pagination. Defaults to 0.
   *
   * @returns List of matching quizzes.
   */
  public async findQuizzes(
    filter: QueryFilter<Quiz>,
    sortField: 'title' | 'created' | 'updated' = 'created',
    sortOrder: 'asc' | 'desc' = 'desc',
    limit: number = 10,
    offset: number = 0,
  ): Promise<Quiz[]> {
    const sortOptions: SortOptions = {
      field: sortField,
      direction: sortOrder === 'asc' ? 1 : -1,
    }

    const result = await this.findWithPagination(filter, {
      skip: offset,
      limit,
      sort: buildSortObject(sortOptions),
      populate: 'owner',
    })

    return result.documents
  }

  @MurLock(60 * 60 * 1000, IMAGE_CLEANUP_LOCK)
  private async withImageCleanupLock<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    return operation()
  }

  private hasUploadedImageReference(quiz: Partial<Quiz>): boolean {
    if (normalizeUploadedImageReference(quiz.imageCoverURL)) return true
    return (quiz.questions ?? []).some((question) =>
      Boolean(
        normalizeUploadedImageReference(question.media?.url) ||
        normalizeUploadedImageReference(
          'imageURL' in question ? question.imageURL : undefined,
        ),
      ),
    )
  }

  /**
   * Creates a new quiz document.
   *
   * @param quiz - The quiz document to create.
   *
   * @returns The created quiz document.
   */
  public async createQuiz(quiz: Partial<Quiz>): Promise<Quiz> {
    if (this.hasUploadedImageReference(quiz)) {
      return this.withImageCleanupLock(() => this.create(quiz))
    }
    return this.create(quiz)
  }

  /**
   * Updates an existing quiz by ID.
   *
   * @param quizId - The unique identifier of the quiz to update.
   * @param quiz - Partial quiz data to update.
   *
   * @returns The updated quiz document.
   *
   * @throws QuizNotFoundException If no quiz is found with the given ID.
   */
  public async updateQuiz(quizId: string, quiz: Partial<Quiz>): Promise<Quiz> {
    const update = () =>
      this.update(
        quizId,
        { ...quiz, updated: new Date() },
        { populate: { path: 'owner' } },
      )
    const document = this.hasUploadedImageReference(quiz)
      ? await this.withImageCleanupLock(update)
      : await update()

    if (!document) {
      throw new QuizNotFoundException(quizId)
    }

    return document
  }

  /**
   * Replaces an existing quiz by merging the provided payload on top of the persisted
   * quiz, then writing the result with findOneAndReplace.
   *
   * Performs a full document replacement using repository `replace` semantics.
   * The provided quiz data is merged on top of the persisted quiz document and the
   * resulting replacement is written using `findOneAndReplace`.
   *
   * This method does not explicitly modify quiz timestamps (for example `updated`).
   * Any timestamp behavior must be handled by schema configuration (for example
   * Mongoose timestamps) or higher-level services.
   *
   * The `owner` relation is populated before returning the replaced document.
   *
   * If no quiz with the given id exists, a {@link QuizNotFoundException} is thrown.
   *
   * @param quizId - The id of the quiz to replace.
   * @param quiz - Partial quiz data applied on top of the persisted quiz document.
   *
   * @returns The replaced quiz document with populated owner.
   *
   * @throws QuizNotFoundException when no quiz exists with the given id.
   */
  public async replaceQuiz(quizId: string, quiz: Partial<Quiz>): Promise<Quiz> {
    const replace = () =>
      this.replace(quizId, quiz, { populate: { path: 'owner' } })
    const document = this.hasUploadedImageReference(quiz)
      ? await this.withImageCleanupLock(replace)
      : await replace()

    if (!document) {
      throw new QuizNotFoundException(quizId)
    }

    return document
  }

  /**
   * Returns public quizzes in paginated batches for discovery snapshot
   * computation.
   *
   * A quiz is included when it satisfies the following minimum criteria:
   *
   * - `visibility` is `QuizVisibility.Public`
   * - `owner` contains a non-null owner reference
   * - `questions` array size is at least 10
   *
   * Quizzes without a cover image or without a meaningful description are
   * **not** excluded — they are included but receive lower quality sub-scores
   * (`QUALITY_WEIGHT_COVER` and `QUALITY_WEIGHT_DESCRIPTION` respectively),
   * so they naturally rank below fully-populated quizzes. This ensures all
   * discovery rails have content even when the quiz corpus is small.
   *
   * Results are returned in `_id` order (deterministic for batched iteration).
   *
   * @param offset - Number of documents to skip (for batch iteration).
   * @param limit - Maximum number of documents to return per batch.
   * @returns Array of matching quiz documents (may be shorter than `limit`
   *   when the end of the result set is reached).
   */
  public async findEligiblePublicQuizzes(
    offset: number,
    limit: number,
  ): Promise<Quiz[]> {
    return this.quizModel
      .find({
        visibility: QuizVisibility.Public,
        owner: { $exists: true, $ne: null },
        'questions.9': { $exists: true },
      })
      .sort({ _id: 1 })
      .skip(offset)
      .limit(limit)
      .exec()
  }

  /**
   * Finds multiple quiz documents by their IDs.
   *
   * Returns all documents whose `_id` is in the provided array. The order of
   * the returned documents is not guaranteed to match the order of `ids`.
   * Documents that do not exist are silently omitted from the result.
   *
   * @param ids - Array of quiz document `_id` values to look up.
   * @returns Array of matching quiz documents (may be shorter than `ids` if some are missing).
   */
  public async findManyByIds(ids: string[]): Promise<Quiz[]> {
    return this.quizModel
      .find({ _id: { $in: ids } })
      .populate('owner')
      .exec()
  }

  /**
   * Collects every managed-upload URL from all quizzes without hydrating full
   * documents or filtering by ownership, visibility, or game mode.
   */
  public async findReferencedUploadedImages(): Promise<Set<string>> {
    const references = new Set<string>()
    type ImageProjection = {
      imageCoverURL?: string
      questions?: Array<{
        media?: { url?: string }
        imageURL?: string
      }>
    }
    const cursor = this.quizModel
      .find(
        {},
        {
          imageCoverURL: 1,
          'questions.media.url': 1,
          'questions.imageURL': 1,
        },
      )
      .lean()
      .cursor() as unknown as AsyncIterable<ImageProjection>

    for await (const quiz of cursor) {
      for (const url of [quiz.imageCoverURL]) {
        const normalized = normalizeUploadedImageReference(url)
        if (normalized) references.add(normalized)
      }
      for (const question of quiz.questions ?? []) {
        for (const url of [question.media?.url, question.imageURL]) {
          const normalized = normalizeUploadedImageReference(url)
          if (normalized) references.add(normalized)
        }
      }
    }

    return references
  }

  /** Checks a single upload URL across all image-bearing quiz fields. */
  public async isUploadedImageReferenced(
    relativePath: string,
  ): Promise<boolean> {
    const [userId, filename] = relativePath.split('/')
    if (
      !userId ||
      !filename ||
      !/^[A-Za-z0-9_-]+$/.test(userId) ||
      !/^[0-9a-f-]+\.webp$/i.test(filename)
    ) {
      return true
    }
    const urlPattern = new RegExp(
      `(?:^|/)uploads/images/${userId}/${filename}(?:[?#].*)?$|^${userId}/${filename}$`,
      'i',
    )
    return Boolean(
      await this.quizModel
        .exists({
          $or: [
            { imageCoverURL: urlPattern },
            { 'questions.media.url': urlPattern },
            { 'questions.imageURL': urlPattern },
          ],
        })
        .exec(),
    )
  }

  /**
   * Deletes a quiz by ID.
   *
   * @param quizId - The unique identifier of the quiz to delete.
   *
   * @throws QuizNotFoundException If no quiz is found with the given ID.
   */
  public async deleteQuiz(quizId: string): Promise<void> {
    const deleted = await this.delete(quizId)

    if (!deleted) {
      throw new QuizNotFoundException(quizId)
    }
  }
}
