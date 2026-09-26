import type { QuestionDto } from '@klurigo/common'
import { GameMode } from '@klurigo/common'
import type { FC } from 'react'

import {
  isClassicMultiChoiceQuestion,
  isClassicPinQuestion,
  isClassicPuzzleQuestion,
  isClassicRangeQuestion,
  isClassicTrueFalseQuestion,
  isClassicTypeAnswerQuestion,
  isZeroToOneHundredRangeQuestion,
} from '../../../../../../utils/questions'
import type {
  QuizQuestionModel,
  QuizQuestionModelFieldChangeFunction,
  QuizQuestionValidationResult,
} from '../../../../utils/QuestionDataSource'

import {
  ClassicMultiChoiceOptionQuestionForm,
  ClassicPinQuestionForm,
  ClassicPuzzleQuestionForm,
  ClassicRangeQuestionForm,
  ClassicTrueFalseQuestionForm,
  ClassicTypeAnswerQuestionForm,
  ZeroToOneHundredRangeQuestionForm,
} from './components'
import styles from './QuestionEditor.module.scss'

export interface QuestionEditorProps {
  mode?: GameMode
  question: QuizQuestionModel
  questionValidation: QuizQuestionValidationResult
  onQuestionValueChange: QuizQuestionModelFieldChangeFunction<QuestionDto>
}

const QuestionEditor: FC<QuestionEditorProps> = ({
  mode,
  question,
  questionValidation,
  onQuestionValueChange,
}) => {
  return (
    <div className={styles.questionEditorContainer}>
      {mode && isClassicMultiChoiceQuestion(mode, question) && (
        <ClassicMultiChoiceOptionQuestionForm
          question={question}
          questionValidation={questionValidation}
          onChange={onQuestionValueChange}
        />
      )}

      {mode && isClassicRangeQuestion(mode, question) && (
        <ClassicRangeQuestionForm
          question={question}
          questionValidation={questionValidation}
          onChange={onQuestionValueChange}
        />
      )}

      {mode && isClassicTrueFalseQuestion(mode, question) && (
        <ClassicTrueFalseQuestionForm
          question={question}
          questionValidation={questionValidation}
          onChange={onQuestionValueChange}
        />
      )}

      {mode && isClassicTypeAnswerQuestion(mode, question) && (
        <ClassicTypeAnswerQuestionForm
          question={question}
          questionValidation={questionValidation}
          onChange={onQuestionValueChange}
        />
      )}

      {mode && isClassicPinQuestion(mode, question) && (
        <ClassicPinQuestionForm
          question={question}
          questionValidation={questionValidation}
          onChange={onQuestionValueChange}
        />
      )}

      {mode && isClassicPuzzleQuestion(mode, question) && (
        <ClassicPuzzleQuestionForm
          question={question}
          questionValidation={questionValidation}
          onChange={onQuestionValueChange}
        />
      )}

      {mode && isZeroToOneHundredRangeQuestion(mode, question) && (
        <ZeroToOneHundredRangeQuestionForm
          question={question}
          questionValidation={questionValidation}
          onChange={onQuestionValueChange}
        />
      )}
    </div>
  )
}

export default QuestionEditor
