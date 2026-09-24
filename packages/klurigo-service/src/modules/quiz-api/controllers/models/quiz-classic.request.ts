import {
  GameMode,
  LanguageCode,
  QuestionType,
  QUIZ_QUESTION_MAX,
  QUIZ_QUESTION_MIN,
  QuizCategory,
  QuizClassicModeRequestDto,
  QuizVisibility,
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

import { QuestionMultiChoice } from './question-multi-choice'
import { QuestionPin } from './question-pin'
import { QuestionPuzzle } from './question-puzzle'
import { QuestionRange } from './question-range'
import { QuestionTrueFalse } from './question-true-false'
import { QuestionTypeAnswer } from './question-type-answer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformQuestionClassicBasedOnType(question: any) {
  switch (question?.type) {
    case QuestionType.MultiChoice:
      return plainToInstance(QuestionMultiChoice, question)
    case QuestionType.Range:
      return plainToInstance(QuestionRange, question)
    case QuestionType.TrueFalse:
      return plainToInstance(QuestionTrueFalse, question)
    case QuestionType.TypeAnswer:
      return plainToInstance(QuestionTypeAnswer, question)
    case QuestionType.Pin:
      return plainToInstance(QuestionPin, question)
    case QuestionType.Puzzle:
      return plainToInstance(QuestionPuzzle, question)
    default:
      throw new BadRequestException('Validation failed')
  }
}

/**
 * Represents the request object for creating and updating a quiz.
 */
@ApiExtraModels(
  QuestionMultiChoice,
  QuestionRange,
  QuestionTrueFalse,
  QuestionTypeAnswer,
  QuestionPin,
  QuestionPuzzle,
)
export class QuizClassicRequest implements QuizClassicModeRequestDto {
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
   * The classic game mode of the quiz.
   */
  @ApiGameModeProperty(GameMode.Classic)
  mode: GameMode.Classic

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
      oneOf: [
        { $ref: getSchemaPath(QuestionMultiChoice) },
        { $ref: getSchemaPath(QuestionRange) },
        { $ref: getSchemaPath(QuestionTrueFalse) },
        { $ref: getSchemaPath(QuestionTypeAnswer) },
        { $ref: getSchemaPath(QuestionPin) },
        { $ref: getSchemaPath(QuestionPuzzle) },
      ],
      discriminator: {
        propertyName: 'type',
        mapping: {
          [QuestionType.MultiChoice]: getSchemaPath(QuestionMultiChoice),
          [QuestionType.Range]: getSchemaPath(QuestionRange),
          [QuestionType.TrueFalse]: getSchemaPath(QuestionTrueFalse),
          [QuestionType.TypeAnswer]: getSchemaPath(QuestionTypeAnswer),
          [QuestionType.Pin]: getSchemaPath(QuestionPin),
          [QuestionType.Puzzle]: getSchemaPath(QuestionPuzzle),
        },
      },
    },
  })
  @IsArray()
  @ArrayMinSize(QUIZ_QUESTION_MIN)
  @ArrayMaxSize(QUIZ_QUESTION_MAX)
  @ValidateNested({ each: true })
  @Transform(({ value }) => value.map(transformQuestionClassicBasedOnType), {
    toClassOnly: true,
  })
  questions: (
    | QuestionMultiChoice
    | QuestionRange
    | QuestionTrueFalse
    | QuestionTypeAnswer
    | QuestionPin
    | QuestionPuzzle
  )[]
}
