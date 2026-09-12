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
  SubmitMultiChoiceQuestionAnswerRequest,
  SubmitPinQuestionAnswerRequest,
  SubmitPuzzleQuestionAnswerRequest,
  SubmitRangeQuestionAnswerRequest,
  SubmitTrueFalseQuestionAnswerRequest,
  SubmitTypeAnswerQuestionAnswerRequest,
} from '../controllers/models/requests'

@Injectable()
export class ParseSubmitQuestionAnswerRequestPipe implements PipeTransform<
  Record<string, unknown>,
  Promise<
    | SubmitMultiChoiceQuestionAnswerRequest
    | SubmitRangeQuestionAnswerRequest
    | SubmitTrueFalseQuestionAnswerRequest
    | SubmitTypeAnswerQuestionAnswerRequest
    | SubmitPinQuestionAnswerRequest
    | SubmitPuzzleQuestionAnswerRequest
  >
> {
  async transform(
    value: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metadata: ArgumentMetadata,
  ): Promise<
    | SubmitMultiChoiceQuestionAnswerRequest
    | SubmitRangeQuestionAnswerRequest
    | SubmitTrueFalseQuestionAnswerRequest
    | SubmitTypeAnswerQuestionAnswerRequest
    | SubmitPinQuestionAnswerRequest
    | SubmitPuzzleQuestionAnswerRequest
  > {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Validation failed')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let object: any
    if (value.type === QuestionType.MultiChoice) {
      object = plainToInstance(SubmitMultiChoiceQuestionAnswerRequest, value)
    } else if (value.type === QuestionType.Range) {
      object = plainToInstance(SubmitRangeQuestionAnswerRequest, value)
    } else if (value.type === QuestionType.TrueFalse) {
      object = plainToInstance(SubmitTrueFalseQuestionAnswerRequest, value)
    } else if (value.type === QuestionType.TypeAnswer) {
      object = plainToInstance(SubmitTypeAnswerQuestionAnswerRequest, value)
    } else if (value.type === QuestionType.Pin) {
      object = plainToInstance(SubmitPinQuestionAnswerRequest, value)
    } else if (value.type === QuestionType.Puzzle) {
      object = plainToInstance(SubmitPuzzleQuestionAnswerRequest, value)
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
