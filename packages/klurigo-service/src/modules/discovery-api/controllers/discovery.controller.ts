import {
  Authority,
  DiscoveryQuizCardDto,
  DiscoveryResponseDto,
  DiscoverySectionKey,
  TokenScope,
} from '@klurigo/common'
import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'

import {
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import { toQuizGameplaySummaryDifficultyPercentage } from '../../quiz-api/services/utils'
import { QuizRepository } from '../../quiz-core/repositories'
import { Quiz } from '../../quiz-core/repositories/models/schemas'
import {
  DISCOVERY_RAIL_PREVIEW_SIZE,
  DISCOVERY_SECTION_ORDER,
} from '../constants'
import { DiscoverySnapshotRepository } from '../repositories'
import type { DiscoverySnapshotSection } from '../repositories/models/schemas'

import { DiscoveryResponse, PaginatedDiscoverySectionResponse } from './models'

/**
 * Controller for the discovery page endpoints.
 *
 * Serves a pre-computed snapshot of curated quiz rails stored in the
 * `discovery_snapshots` collection. Provides two endpoints:
 *
 * - `GET /discover` returns the full discovery page with each section's first
 *   DISCOVERY_RAIL_PREVIEW_SIZE entries hydrated into quiz cards. Sections are
 *   returned in the fixed order FEATURED, TRENDING, TOP_RATED, MOST_PLAYED,
 *   NEW_AND_NOTEWORTHY, CATEGORY_SPOTLIGHT; empty sections are skipped.
 *
 * - `GET /discover/section/:key` returns an offset-paginated "see all" view
 *   of a single rail, reading directly from the snapshot's stored entries to
 *   guarantee ordering consistency with the rail preview.
 *
 * All endpoints require a valid bearer token with the DISCOVERY authority.
 */
@ApiBearerAuth()
@ApiTags('discovery')
@RequiresScopes(TokenScope.User)
@RequiredAuthorities(Authority.Discovery)
@Controller('discover')
export class DiscoveryController {
  private readonly logger = new Logger(DiscoveryController.name)

  /**
   * Creates a DiscoveryController.
   *
   * @param discoverySnapshotRepository - Repository for reading the discovery snapshot.
   * @param quizRepository - Repository for batch-fetching quiz documents by ID.
   */
  constructor(
    private readonly discoverySnapshotRepository: DiscoverySnapshotRepository,
    private readonly quizRepository: QuizRepository,
  ) {}

  /**
   * Returns the latest discovery snapshot with hydrated quiz cards.
   *
   * Loads the current snapshot and, for each non-empty section, slices the
   * first DISCOVERY_RAIL_PREVIEW_SIZE entries, batch-fetches the corresponding
   * quiz documents via `QuizRepository.findManyByIds`, and maps them to
   * DiscoveryQuizCardDto in snapshot entry order (descending by score, as
   * written by the compute service).
   *
   * Sections are returned in the fixed display order: FEATURED, TRENDING,
   * TOP_RATED, MOST_PLAYED, NEW_AND_NOTEWORTHY, CATEGORY_SPOTLIGHT. Sections
   * that are absent from the snapshot or have zero entries are skipped.
   *
   * When no snapshot exists, returns `{ sections: [], generatedAt: null }`.
   *
   * @returns The discovery response with hydrated rails and the snapshot timestamp.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrieve the discovery snapshot.',
    description:
      'Returns curated discovery rails with hydrated quiz cards in a fixed ' +
      'section order. Each section contains the first ' +
      'DISCOVERY_RAIL_PREVIEW_SIZE entries from the snapshot.',
  })
  @ApiOkResponse({
    description: 'The latest discovery snapshot with hydrated quiz cards.',
    type: DiscoveryResponse,
  })
  public async getDiscovery(): Promise<DiscoveryResponseDto> {
    const snapshot = await this.discoverySnapshotRepository.findLatest()

    if (!snapshot) {
      return { sections: [], generatedAt: null }
    }

    const sectionMap = new Map<DiscoverySectionKey, DiscoverySnapshotSection>()
    for (const section of snapshot.sections) {
      sectionMap.set(section.key, section)
    }

    const allQuizIds: string[] = []
    const sectionSlices = new Map<DiscoverySectionKey, string[]>()

    for (const key of DISCOVERY_SECTION_ORDER) {
      const section = sectionMap.get(key)
      if (!section || section.entries.length === 0) continue

      const slicedIds = section.entries
        .slice(0, DISCOVERY_RAIL_PREVIEW_SIZE)
        .map((e) => e.quizId)
      sectionSlices.set(key, slicedIds)
      allQuizIds.push(...slicedIds)
    }

    const quizMap = await this.buildQuizMap(allQuizIds)

    const sections = DISCOVERY_SECTION_ORDER.filter((key) =>
      sectionSlices.has(key),
    ).map((key) => {
      const ids = sectionSlices.get(key)!
      return {
        key,
        quizzes: this.hydrateCards(ids, quizMap),
      }
    })

    return {
      sections,
      generatedAt: snapshot.generatedAt,
    }
  }

  /**
   * Returns an offset-paginated view of a single discovery rail section.
   *
   * Reads directly from the snapshot's stored entries array for the requested
   * section key, applies the offset and limit, then batch-fetches and hydrates
   * the corresponding quiz documents. This snapshot-based approach guarantees
   * that the "see all" ordering is always consistent with the rail preview the
   * user saw on the main discovery page.
   *
   * The snapshotTotal in the response equals the number of stored entries in
   * the snapshot for the requested section. It is bounded by
   * DISCOVERY_RAIL_CAP_FEATURED (for FEATURED) or DISCOVERY_RAIL_CAP_STANDARD
   * (for all other rails) and is NOT the total count of eligible quizzes in
   * the database.
   *
   * If the key is not found in the snapshot (unknown key or section has zero
   * entries), returns `{ results: [], snapshotTotal: 0, limit, offset }`.
   *
   * @param key - The discovery section key identifying the rail.
   * @param limit - Maximum number of results to return (1-50, default 20).
   * @param offset - Zero-based starting index within the snapshot entries (default 0).
   * @returns The paginated section response with hydrated quiz cards.
   */
  @Get('section/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retrieve a paginated discovery section.',
    description:
      'Returns an offset-paginated list of quiz cards for a single discovery ' +
      'rail. Pagination reads directly from the snapshot to ensure ordering ' +
      'consistency with the rail preview.',
  })
  @ApiParam({
    name: 'key',
    description: 'The discovery section key identifying the rail.',
    enum: DiscoverySectionKey,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results to return.',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Zero-based starting index within the snapshot entries.',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiOkResponse({
    description: 'The paginated discovery section with hydrated quiz cards.',
    type: PaginatedDiscoverySectionResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters (e.g. limit out of range).',
  })
  public async getSection(
    @Param('key') key: DiscoverySectionKey,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<PaginatedDiscoverySectionResponse> {
    const clampedLimit = Math.max(1, Math.min(50, limit))
    const clampedOffset = Math.max(0, offset)

    const snapshot = await this.discoverySnapshotRepository.findLatest()
    const section = snapshot?.sections.find((s) => s.key === key)

    if (!section || section.entries.length === 0) {
      return {
        key,
        results: [],
        snapshotTotal: 0,
        limit: clampedLimit,
        offset: clampedOffset,
      }
    }

    const snapshotTotal = section.entries.length
    const slicedIds = section.entries
      .slice(clampedOffset, clampedOffset + clampedLimit)
      .map((e) => e.quizId)

    const quizMap = await this.buildQuizMap(slicedIds)

    return {
      key,
      results: this.hydrateCards(slicedIds, quizMap),
      snapshotTotal,
      limit: clampedLimit,
      offset: clampedOffset,
    }
  }

  /**
   * Batch-fetches quiz documents and indexes them by ID for O(1) lookup.
   */
  private async buildQuizMap(ids: string[]): Promise<Map<string, Quiz>> {
    if (ids.length === 0) return new Map()
    const quizzes = await this.quizRepository.findManyByIds(ids)
    const map = new Map<string, Quiz>()
    for (const quiz of quizzes) {
      map.set(quiz._id, quiz)
    }
    return map
  }

  /**
   * Maps an ordered list of quiz IDs to DiscoveryQuizCardDto instances,
   * preserving snapshot entry order. Missing quizzes and quizzes without a
   * valid populated owner are skipped.
   */
  private hydrateCards(
    ids: string[],
    quizMap: Map<string, Quiz>,
  ): DiscoveryQuizCardDto[] {
    return ids
      .map((id) => quizMap.get(id))
      .filter((quiz): quiz is Quiz => quiz != null)
      .map((quiz) => this.mapQuizToCard(quiz))
      .filter((card): card is DiscoveryQuizCardDto => card != null)
  }

  /**
   * Maps a Quiz document to a DiscoveryQuizCardDto, or skips it when its owner
   * reference could not be populated. This can happen when the owner was
   * deleted after the snapshot was generated or when legacy data has no owner.
   */
  private mapQuizToCard(quiz: Quiz): DiscoveryQuizCardDto | null {
    const owner = quiz.owner
    if (
      owner == null ||
      typeof owner !== 'object' ||
      typeof owner._id !== 'string' ||
      owner._id.length === 0
    ) {
      this.logger.warn(
        `Skipping discovery quiz '${quiz._id}' because its owner is missing or invalid.`,
      )
      return null
    }

    return {
      id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      imageCoverURL: quiz.imageCoverURL,
      category: quiz.category,
      languageCode: quiz.languageCode,
      mode: quiz.mode,
      numberOfQuestions: quiz.questions.length,
      author: {
        id: owner._id,
        name: owner.defaultNickname,
      },
      gameplaySummary: {
        count: quiz.gameplaySummary.count,
        totalPlayerCount: quiz.gameplaySummary.totalPlayerCount,
        lastPlayed: quiz.gameplaySummary.lastPlayedAt,
        difficultyPercentage: toQuizGameplaySummaryDifficultyPercentage(
          quiz.gameplaySummary,
        ),
      },
      ratingSummary: {
        stars: quiz.ratingSummary.avg,
        comments: quiz.ratingSummary.commentCount,
        total: quiz.ratingSummary.count,
      },
      created: quiz.created,
    }
  }
}
