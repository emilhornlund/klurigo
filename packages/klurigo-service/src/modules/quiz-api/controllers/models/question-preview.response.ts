import { QuestionPreviewDto, QuestionType } from '@klurigo/common'
import { ApiProperty } from '@nestjs/swagger'

/** A read-only quiz sample with no answer or media data. */
export class QuestionPreviewResponse implements QuestionPreviewDto {
  @ApiProperty({ enum: QuestionType, example: QuestionType.MultiChoice })
  type: QuestionType

  @ApiProperty({ example: 'What is the capital of Sweden?' })
  question: string
}
