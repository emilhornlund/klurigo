import type { FC } from 'react'

import {
  Button,
  IconButtonArrowLeft,
  IconButtonArrowRight,
  Page,
} from '../../../../components'

import styles from './QuizCreatorPageV2UI.module.scss'

export type QuizCreatorPageV2UIProps = {}

const QuizCreatorPageV2UI: FC<QuizCreatorPageV2UIProps> = ({}) => {
  return (
    <Page
      layout="fullBleed"
      width="full"
      height="full"
      footer={
        <div className={styles.quizCreatorPageFooter}>
          <IconButtonArrowLeft
            id="previous-question-button"
            type="button"
            size="small"
            value="Previous question"
            kind="call-to-action"
            onClick={() => undefined}
          />
          <IconButtonArrowRight
            id="next-question-button"
            type="button"
            size="small"
            value="Next question"
            kind="call-to-action"
            onClick={() => undefined}
          />
        </div>
      }>
      <div className={styles.quizCreatorPageContainer}>Content</div>
    </Page>
  )
}

export default QuizCreatorPageV2UI
