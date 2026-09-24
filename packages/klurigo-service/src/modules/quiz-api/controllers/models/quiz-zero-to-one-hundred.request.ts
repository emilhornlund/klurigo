import {
  GameMode,
  LanguageCode,
  QuestionType,
  QUIZ_QUESTION_MAX,
  QUIZ_QUESTION_MIN,
  QuizCategory,
  QuizVisibility,
  QuizZeroToOneHundredModeRequestDto,
} from '@klurigo/common'
import { BadRequestException } from '@nestjs/common'
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger'
import { plainToInstance, Transform } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator'

import {
  ApiGameModeProperty,
  ApiQuizCategoryProperty,
  ApiQuizDescriptionProperty,
  ApiQuizImageCoverProperty,
  ApiQuizLanguageCodeProperty,
  ApiQuizTitleProperty,
  ApiQuizVisibilityProperty,
} from '../decorators/api'

import { QuestionZeroToOneHundredRange } from './question-zero-to-one-hundred-range'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformQuestionZeroToOneHundredBasedOnType(question: any) {
  switch (question?.type) {
    case QuestionType.Range:
      return plainToInstance(QuestionZeroToOneHundredRange, question)
    default:
      throw new BadRequestException('Validation failed')
  }
}

/**
 * Represents the request object for creating and updating a zero to one hundred quiz.
 */
@ApiExtraModels(QuestionZeroToOneHundredRange)
export class QuizZeroToOneHundredRequest implements QuizZeroToOneHundredModeRequestDto {
  /**
   * The title of the quiz.
   */
  @ApiQuizTitleProperty()
  title: string

  /**
   * A description of the quiz.
   */
  @ApiQuizDescriptionProperty()
  description?: string

  /**
   * Whether the quiz is public or private.
   */
  @ApiQuizVisibilityProperty()
  visibility: QuizVisibility

  /**
   * Specifies the category of the quiz.
   */
  @ApiQuizCategoryProperty()
  category: QuizCategory

  /**
   * The URL of the cover image for the quiz.
   */
  @ApiQuizImageCoverProperty()
  imageCoverURL?: string

  /**
   * The language code of the quiz.
   */
  @ApiQuizLanguageCodeProperty()
  languageCode: LanguageCode

  /**
   * The zero to one hundred game mode of this quiz.
   */
  @ApiGameModeProperty(GameMode.ZeroToOneHundred)
  mode: GameMode.ZeroToOneHundred

  /**
   *
   */
  @ApiProperty({
    description:
      'The list of questions to be included in the quiz. Must include at least one question.',
    required: true,
    type: 'array',
    minItems: QUIZ_QUESTION_MIN,
    maxItems: QUIZ_QUESTION_MAX,
    items: {
      oneOf: [{ $ref: getSchemaPath(QuestionZeroToOneHundredRange) }],
    },
  })
  @IsArray()
  @ArrayMinSize(QUIZ_QUESTION_MIN)
  @ArrayMaxSize(QUIZ_QUESTION_MAX)
  @ValidateNested({ each: true })
  @Transform(
    ({ value }) => value.map(transformQuestionZeroToOneHundredBasedOnType),
    {
      toClassOnly: true,
    },
  )
  questions: QuestionZeroToOneHundredRange[]
}
