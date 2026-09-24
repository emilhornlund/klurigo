import { QuizAuthorResponseDto } from '@klurigo/common'

import { ApiUuidProperty } from '../../../../app/swagger'

/**
 * Represents the response object for a quiz author.
 */
export class QuizAuthorResponse implements QuizAuthorResponseDto {
  /**
   * The unique identifier of the author.
   */
  @ApiUuidProperty({
    title: 'Author ID',
    description: 'The unique identifier of the author.',
  })
  id: string

  /**
   * The name of the author.
   */
  name: string
}
