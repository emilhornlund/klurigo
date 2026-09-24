import {
  ApiPaginationLimitProperty,
  ApiPaginationOffsetProperty,
} from '../../../../app/swagger'

/**
 * Represents the query parameters used to filter and paginate game history results.
 */
export class GameHistoryPageFilter {
  /**
   * The maximum number of game history results to retrieve per page.
   */
  @ApiPaginationLimitProperty({
    description:
      'The maximum number of game history results to retrieve per page.',
    default: 5,
  })
  limit?: number

  /**
   * The number of game history results to skip before starting retrieval.
   */
  @ApiPaginationOffsetProperty({
    description:
      'The number of game history results to skip before starting retrieval.',
    default: 0,
  })
  offset?: number
}
