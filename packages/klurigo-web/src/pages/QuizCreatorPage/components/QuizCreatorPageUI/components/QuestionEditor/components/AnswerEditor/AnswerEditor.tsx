import { GameMode, QuestionType } from '@klurigo/common'
import type { FC } from 'react'

import type { QuizQuestionValidationResult } from '../../../../../../utils/QuestionDataSource'
import { FieldWrapper } from '../shared'

import MultiChoiceAnswerEditor, {
  type MultiChoiceAnswerEditorProps,
} from './MultiChoiceAnswerEditor'
import PinAnswerEditor, { type PinAnswerEditorProps } from './PinAnswerEditor'
import PuzzleAnswerEditor, {
  type PuzzleAnswerEditorProps,
} from './PuzzleAnswerEditor'
import RangeAnswerEditor, {
  type RangeAnswerEditorProps,
} from './RangeAnswerEditor'
import TrueFalseAnswerEditor, {
  type TrueFalseAnswerEditorProps,
} from './TrueFalseAnswerEditor'
import TypeAnswerEditor, {
  type TypeAnswerEditorProps,
} from './TypeAnswerEditor'
import ZeroToOneHundredRangeAnswerEditor, {
  type ZeroToOneHundredRangeAnswerEditorProps,
} from './ZeroToOneHundredRangeAnswerEditor'

export type AnswerEditorProps = (
  | ({ type: QuestionType.MultiChoice } & Omit<
      MultiChoiceAnswerEditorProps,
      'validation'
    >)
  | ({ type: QuestionType.TrueFalse } & Omit<
      TrueFalseAnswerEditorProps,
      'validation'
    >)
  | ({ type: QuestionType.TypeAnswer } & Omit<
      TypeAnswerEditorProps,
      'validation'
    >)
  | ({ type: QuestionType.Puzzle } & Omit<
      PuzzleAnswerEditorProps,
      'validation'
    >)
  | ({ type: QuestionType.Pin } & Omit<PinAnswerEditorProps, 'validation'>)
  | ({ type: QuestionType.Range; mode: GameMode.Classic } & Omit<
      RangeAnswerEditorProps,
      'validation'
    >)
  | ({ type: QuestionType.Range; mode: GameMode.ZeroToOneHundred } & Omit<
      ZeroToOneHundredRangeAnswerEditorProps,
      'validation'
    >)
) & {
  validation: QuizQuestionValidationResult
  validationRevealed?: boolean
  footer?: string
}

const AnswerEditor: FC<AnswerEditorProps> = (props) => {
  switch (props.type) {
    case QuestionType.MultiChoice:
      return (
        <FieldWrapper
          label="Answer options"
          info="The answers players can choose from."
          footer={props.footer}
          required>
          <MultiChoiceAnswerEditor {...props} />
        </FieldWrapper>
      )
    case QuestionType.TrueFalse:
      return (
        <FieldWrapper label="Correct answer" footer={props.footer} required>
          <TrueFalseAnswerEditor {...props} />
        </FieldWrapper>
      )
    case QuestionType.TypeAnswer:
      return (
        <FieldWrapper
          label="Accepted answers"
          info="Any listed answer will be accepted as correct."
          footer={props.footer}
          required>
          <TypeAnswerEditor {...props} />
        </FieldWrapper>
      )
    case QuestionType.Puzzle:
      return (
        <FieldWrapper
          label="Puzzle order"
          info="Players receive these items in a random order and must arrange them correctly."
          footer={props.footer}
          required>
          <PuzzleAnswerEditor {...props} />
        </FieldWrapper>
      )
    case QuestionType.Pin:
      return <PinAnswerEditor {...props} />
    case QuestionType.Range:
      switch (props.mode) {
        case GameMode.Classic:
          return <RangeAnswerEditor {...props} />
        case GameMode.ZeroToOneHundred:
          return <ZeroToOneHundredRangeAnswerEditor {...props} />
      }
  }
}

export default AnswerEditor
