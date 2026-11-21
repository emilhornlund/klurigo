import { faListOl } from '@fortawesome/free-solid-svg-icons'
import type { QuestionPreviewDto } from '@klurigo/common'
import { type FC, useId } from 'react'

import {
  Accordion,
  Button,
  Stack,
  Typography,
} from '../../../../../../components'
import { QuestionTypeLabels } from '../../../../../../models'

import styles from './SampleQuestions.module.scss'

export type SampleQuestionsState =
  | { status: 'loading' }
  | { status: 'error'; onRetry: () => void }
  | { status: 'ready'; questions: readonly QuestionPreviewDto[] }

/** Displays the quiz's opening questions without answers or media. */
const SampleQuestions: FC<{ state: SampleQuestionsState }> = ({ state }) => {
  const retryId = useId()
  const count = state.status === 'ready' ? state.questions.length : 0

  return (
    <Accordion
      title="Sample questions"
      icon={faListOl}
      description={
        count > 0
          ? `${count} ${count === 1 ? 'question' : 'questions'} from this quiz`
          : undefined
      }>
      {state.status === 'loading' ? (
        <Typography
          variant="control"
          align="center"
          color="inverse"
          role="status">
          Hang tight — we’re rounding up the questions…
        </Typography>
      ) : state.status === 'error' ? (
        <Stack align="center" spacing="compact">
          <Typography
            variant="control"
            align="center"
            color="inverse"
            role="status">
            Oops! The sample questions didn’t load.
          </Typography>
          <Button
            id={`${retryId}-retry`}
            type="button"
            variant="primary"
            size="small"
            value="Try again"
            onClick={state.onRetry}
          />
        </Stack>
      ) : state.questions.length === 0 ? (
        <Typography variant="control" align="center" color="inverse">
          No sample questions to peek at yet.
        </Typography>
      ) : (
        <ol className={styles.list} role="list">
          {state.questions.map(({ type, question }, index) => (
            <li key={index} className={styles.item}>
              <span className={styles.number}>{index + 1}</span>
              <div className={styles.prompt}>
                <Typography variant="control2" color="subtle" bold noOpacity>
                  {QuestionTypeLabels[type]}
                </Typography>
                <Typography variant="control" noOpacity>
                  {question}
                </Typography>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Accordion>
  )
}

export default SampleQuestions
