import { QuestionType, QuestionZeroToOneHundredRangeDto } from '@klurigo/common'
import { ApiExtraModels, ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNumber, Max, Min } from 'class-validator'

import {
  ApiQuestionDurationProperty,
  ApiQuestionInfoProperty,
  ApiQuestionMediaProperty,
  ApiQuestionProperty,
  ApiQuestionTypeProperty,
} from '../decorators/api'

import {
  QuestionAudioMedia,
  QuestionImageMedia,
  QuestionVideoMedia,
} from './question-media'

/**
 * Represents a data transfer object for a range-based zero to one hundred question.
 */
@ApiExtraModels(QuestionImageMedia, QuestionAudioMedia, QuestionVideoMedia)
export class QuestionZeroToOneHundredRange implements QuestionZeroToOneHundredRangeDto {
  /**
   * The type of the question, set to `Range`.
   */
  @ApiQuestionTypeProperty({
    description: `The type of the question, which is set to ${QuestionType.Range} for this request.`,
    explicitType: QuestionType.Range,
  })
  type: QuestionType.Range

  /**
   * The text of the question.
   */
  @ApiQuestionProperty()
  question: string

  /**
   * Optional media associated with the question.
   */
  @ApiQuestionMediaProperty({
    image: () => QuestionImageMedia,
    audio: () => QuestionAudioMedia,
    video: () => QuestionVideoMedia,
  })
  media?: QuestionImageMedia | QuestionAudioMedia | QuestionVideoMedia

  /**
   * The correct answer within the range.
   */
  @ApiProperty({
    description:
      'The correct value for the range question, which must be within the range of 0 and 100.',
    example: 50,
    required: true,
    minimum: 0,
    maximum: 100,
    type: Number,
  })
  @IsNumber()
  @IsInt({ message: 'The correct answer must be a whole number.' })
  @Min(0)
  @Max(100)
  correct: number

  /**
   * The duration in seconds allowed to answer the question.
   */
  @ApiQuestionDurationProperty()
  duration: number

  /**
   * Optional info text shown with the question result/review
   * (explanation, fun fact, or source).
   */
  @ApiQuestionInfoProperty()
  info?: string
}
