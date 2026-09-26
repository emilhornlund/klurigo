import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import type { FC } from 'react'

import { Button } from '../../../../../../components'

import styles from './QuestionNavigation.module.scss'

export interface QuestionNavigationProps {
  selectedQuestionIndex: number
  totalQuestions: number
  onSelectedQuestionIndex: (index: number) => void
}

const QuestionNavigation: FC<QuestionNavigationProps> = ({
  selectedQuestionIndex,
  totalQuestions,
  onSelectedQuestionIndex,
}) => (
  <nav className={styles.questionNavigation} aria-label="Question navigation">
    <Button
      id="previous-question-button"
      type="button"
      size="small"
      value="Previous question"
      icon={faChevronLeft}
      disabled={selectedQuestionIndex <= 0}
      onClick={() => onSelectedQuestionIndex(selectedQuestionIndex - 1)}
    />
    <span>{`Question ${selectedQuestionIndex + 1} of ${totalQuestions}`}</span>
    <Button
      id="next-question-button"
      type="button"
      size="small"
      value="Next question"
      icon={faChevronRight}
      iconPosition="trailing"
      disabled={selectedQuestionIndex >= totalQuestions - 1}
      onClick={() => onSelectedQuestionIndex(selectedQuestionIndex + 1)}
    />
  </nav>
)

export default QuestionNavigation
