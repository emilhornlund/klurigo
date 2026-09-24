import {
  DiscoveryQuizCardDto,
  GameMode,
  LanguageCode,
  QuizCategory,
} from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'

import { ApiDateTimeProperty, ApiUuidProperty } from '../../../../app/swagger'
import { QuizAuthorResponse } from '../../../quiz-api/controllers/models'
import { QuizGameplaySummaryResponse } from '../../../quiz-api/controllers/models/quiz-gameplay-summary.response'
import { QuizRatingSummaryResponse } from '../../../quiz-api/controllers/models/quiz-rating-summary.response'

/**
 * API response model for a lightweight quiz card in discovery rails.
 *
 * Implements {@link DiscoveryQuizCardDto} so the response shape is type-checked
 * against the shared contract defined in `@klurigo/common`.
 *
 * Contains only the fields required to render a quiz card in discovery. It
 * intentionally omits fields that are irrelevant at browse time (e.g.
 * visibility, questions, and updated timestamp).
 */
export class DiscoveryQuizCardResponse implements DiscoveryQuizCardDto {
  /**
   * The unique identifier of the quiz.
   */
  @ApiUuidProperty({
    title: 'Quiz ID',
    description: 'The unique identifier of the quiz.',
    example: '2e3c7d0a-6c2b-4e47-9f38-7b9b3b9a2a18',
  })
  public readonly id: string

  /**
   * The display title of the quiz.
   */
  @ApiProperty({
    title: 'Title',
    description: 'The display title of the quiz.',
    example: 'Capitals of Europe',
  })
  public readonly title: string

  /**
   * A short description of the quiz content.
   */
  @ApiProperty({
    title: 'Description',
    description: 'A short description of the quiz content.',
    required: false,
    example: 'Test your knowledge of European capitals.',
  })
  public readonly description?: string

  /**
   * URL of the quiz cover image.
   *
   * All discovery-eligible quizzes are guaranteed to have a non-empty value.
   */
  @ApiProperty({
    title: 'Cover Image URL',
    description:
      'URL of the quiz cover image. Discovery-eligible quizzes are guaranteed to have a non-empty value.',
    required: false,
    example: 'https://cdn.klurigo.com/quizzes/2e3c7d0a/cover.jpg',
  })
  public readonly imageCoverURL?: string

  /**
   * The subject category of the quiz.
   */
  @ApiProperty({
    title: 'Category',
    description: 'The subject category of the quiz.',
    enum: QuizCategory,
    example: 'Geography',
  })
  public readonly category: QuizCategory

  /**
   * BCP 47-style language code indicating the primary language of the quiz.
   */
  @ApiProperty({
    title: 'Language Code',
    description:
      'BCP 47-style language code indicating the primary language of the quiz.',
    enum: LanguageCode,
    example: 'en',
  })
  public readonly languageCode: LanguageCode

  /**
   * The game mode the quiz is played in.
   */
  @ApiProperty({
    title: 'Game Mode',
    description: 'The game mode the quiz is played in.',
    enum: GameMode,
    example: 'Classic',
  })
  public readonly mode: GameMode

  /**
   * Total number of questions in the quiz.
   */
  @ApiProperty({
    title: 'Number of Questions',
    description: 'Total number of questions in the quiz.',
    example: 12,
  })
  public readonly numberOfQuestions: number

  /**
   * Author metadata for attribution display.
   */
  @ApiProperty({
    title: 'Author',
    description: 'Author metadata for attribution display.',
    type: QuizAuthorResponse,
  })
  public readonly author: QuizAuthorResponse

  /**
   * Aggregated gameplay statistics (play counts, last played, difficulty).
   */
  @ApiProperty({
    title: 'Gameplay Summary',
    description:
      'Aggregated gameplay statistics (play counts, last played, difficulty).',
    type: QuizGameplaySummaryResponse,
  })
  public readonly gameplaySummary: QuizGameplaySummaryResponse

  /**
   * Aggregated rating information (average stars, comment count).
   */
  @ApiProperty({
    title: 'Rating Summary',
    description:
      'Aggregated rating information (average stars, comment count).',
    type: QuizRatingSummaryResponse,
  })
  public readonly ratingSummary: QuizRatingSummaryResponse

  /**
   * Timestamp of when the quiz was originally created.
   */
  @ApiDateTimeProperty({
    title: 'Created',
    description: 'Timestamp of when the quiz was originally created.',
    example: '2026-02-22T09:30:00.000Z',
  })
  public readonly created: Date
}
