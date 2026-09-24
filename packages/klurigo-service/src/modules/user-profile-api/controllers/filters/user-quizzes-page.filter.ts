import { UserQuizzesPageFilterDto } from '@klurigo/common'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'

import {
  ApiPaginationLimitProperty,
  ApiPaginationOffsetProperty,
} from '../../../../app/swagger'

/**
 * Request query parameters for fetching a user's public quizzes with pagination and sorting.
 */
export class UserQuizzesPageFilter implements UserQuizzesPageFilterDto {
  /**
   * The field by which to sort the results.
   */
  @ApiPropertyOptional({
    name: 'sort',
    description: 'The field by which to sort the results.',
    enum: ['title', 'created', 'updated'],
    required: false,
    default: 'title',
    example: 'title',
  })
  @IsOptional()
  @IsEnum(['title', 'created', 'updated'], {
    message:
      'sort must be one of the following values: title, created, updated',
  })
  sort?: 'title' | 'created' | 'updated'

  /**
   * The sort order for the results.
   */
  @ApiPropertyOptional({
    name: 'order',
    description: 'The sort order for the results.',
    enum: ['asc', 'desc'],
    required: false,
    default: 'asc',
    example: 'asc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'order must be one of the following values: asc, desc',
  })
  order?: 'asc' | 'desc'

  /**
   * The maximum number of quizzes to retrieve per page.
   */
  @ApiPaginationLimitProperty({
    description: 'The maximum number of quizzes to retrieve per page.',
    default: 10,
  })
  limit: number

  /**
   * The number of quizzes to skip before starting retrieval.
   */
  @ApiPaginationOffsetProperty({
    description: 'The number of quizzes to skip before starting retrieval.',
    default: 0,
  })
  offset: number
}
