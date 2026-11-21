import type { QuestionPreviewDto } from '@klurigo/common'
import { type FC, useId } from 'react'

import { Button, Stack, Typography } from '../../../../../components'
import { QuestionTypeLabels } from '../../../../../models/labels'

import styles from './SampleQuestions.module.scss'

export type SampleQuestionsState =
  | { status: 'loading' }
  | { status: 'error'; onRetry: () => void }
  | { status: 'ready'; questions: readonly QuestionPreviewDto[] }

/** Displays the quiz's opening prompts without answers or media. */
const SampleQuestions: FC<{ state: SampleQuestionsState }> = ({ state }) => {
  const headingId = useId()

  return (
    <Stack as="section" width="full" aria-labelledby={headingId}>
      <Typography
        id={headingId}
        variant="title3"
        align="center"
        color="inverse">
        Sample questions
      </Typography>

      {state.status === 'loading' ? (
        <Typography
          variant="body2"
          align="center"
          color="inverse"
          role="status">
          Loading sample questions…
        </Typography>
      ) : state.status === 'error' ? (
        <Stack align="center" spacing="compact">
          <Typography
            variant="body2"
            align="center"
            color="inverse"
            role="status">
            We couldn’t load the sample questions.
          </Typography>
          <Button
            id={`${headingId}-retry`}
            type="button"
            variant="primary"
            size="small"
            value="Retry"
            onClick={state.onRetry}
          />
        </Stack>
      ) : state.questions.length === 0 ? (
        <Typography variant="body2" align="center" color="inverse">
          No sample questions available.
        </Typography>
      ) : (
        <Stack as="ol" className={styles.list}>
          {state.questions.map(({ type, question }, index) => (
            <li key={index}>
              <Typography variant="control2" bold color="inverse">
                {QuestionTypeLabels[type]}
              </Typography>
              <Typography variant="body2" color="inverse">
                {question}
              </Typography>
            </li>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

export default SampleQuestions
