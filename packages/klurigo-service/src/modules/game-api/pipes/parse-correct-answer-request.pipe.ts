import { QuestionType } from '@klurigo/common'
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { ValidationException } from '../../../app/exceptions'
import {
  MultiChoiceQuestionCorrectAnswerRequest,
  RangeQuestionCorrectAnswerRequest,
  TrueFalseQuestionCorrectAnswerRequest,
  TypeAnswerQuestionCorrectAnswerRequest,
} from '../controllers/models/requests'

/**
 * Transforms and validates a polymorphic correct answer request based on the `type` field.
 *
 * Determines the correct DTO to instantiate based on the `type`, validates it, and throws
 * a `ValidationException` if validation fails.
 */
@Injectable()
export class ParseCorrectAnswerRequestPipe implements PipeTransform<
  Record<string, unknown>,
  Promise<
    | MultiChoiceQuestionCorrectAnswerRequest
    | RangeQuestionCorrectAnswerRequest
    | TrueFalseQuestionCorrectAnswerRequest
    | TypeAnswerQuestionCorrectAnswerRequest
  >
> {
  /**
   * Parses and validates the incoming request body to match the appropriate correct answer DTO.
   *
   * @param value - The raw request body to transform.
   * @param metadata - The metadata about the request argument (not used).
   * @returns The validated correct answer request DTO matching the question type.
   * @throws {BadRequestException} If the `type` is missing or invalid.
   * @throws {ValidationException} If validation of the parsed DTO fails.
   */
  async transform(
    value: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metadata: ArgumentMetadata,
  ): Promise<
    | MultiChoiceQuestionCorrectAnswerRequest
    | RangeQuestionCorrectAnswerRequest
    | TrueFalseQuestionCorrectAnswerRequest
    | TypeAnswerQuestionCorrectAnswerRequest
  > {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Validation failed')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let object: any
    if (value.type === QuestionType.MultiChoice) {
      object = plainToInstance(MultiChoiceQuestionCorrectAnswerRequest, value)
    } else if (value.type === QuestionType.Range) {
      object = plainToInstance(RangeQuestionCorrectAnswerRequest, value)
    } else if (value.type === QuestionType.TrueFalse) {
      object = plainToInstance(TrueFalseQuestionCorrectAnswerRequest, value)
    } else if (value.type === QuestionType.TypeAnswer) {
      object = plainToInstance(TypeAnswerQuestionCorrectAnswerRequest, value)
    } else if (
      value.type === QuestionType.Pin ||
      value.type === QuestionType.Puzzle
    ) {
      throw new BadRequestException(
        `Correct answer changes are not supported for ${value.type} questions`,
      )
    } else {
      throw new BadRequestException('Validation failed')
    }
    const errors = await validate(object)
    if (errors.length > 0) {
      throw new ValidationException(errors)
    }
    return object
  }
}
