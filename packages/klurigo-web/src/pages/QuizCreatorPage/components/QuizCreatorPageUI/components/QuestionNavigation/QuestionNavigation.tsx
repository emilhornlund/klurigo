import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import type { FC } from 'react'

import { Button, Typography } from '../../../../../../components'
import EditorPanel from '../EditorPanel'

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
  <EditorPanel
    as="nav"
    className={styles.questionNavigationPanel}
    contentClassName={styles.questionNavigation}
    aria-label="Question navigation">
    <div className={styles.previousAction}>
      <Button
        id="previous-question-button"
        type="button"
        variant="outline"
        surface="light"
        value="Previous question"
        icon={faArrowLeft}
        disabled={selectedQuestionIndex <= 0}
        onClick={() => onSelectedQuestionIndex(selectedQuestionIndex - 1)}
      />
    </div>

    <Typography
      variant="control"
      className={styles.questionPosition}
      align="center">
      {`Question ${selectedQuestionIndex + 1} of ${totalQuestions}`}
    </Typography>

    <div className={styles.nextAction}>
      <Button
        id="next-question-button"
        type="button"
        variant="primary"
        surface="light"
        value="Next question"
        icon={faArrowRight}
        iconPosition="trailing"
        disabled={selectedQuestionIndex >= totalQuestions - 1}
        onClick={() => onSelectedQuestionIndex(selectedQuestionIndex + 1)}
      />
    </div>
  </EditorPanel>
)

export default QuestionNavigation
