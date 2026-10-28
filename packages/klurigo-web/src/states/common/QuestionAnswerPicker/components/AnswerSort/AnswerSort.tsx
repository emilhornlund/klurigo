import { faRocket } from '@fortawesome/free-solid-svg-icons'
import type { GameQuestionPlayerAnswerEvent } from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'

import type { SortableTableValue } from '../../../../../components'
import { Button, SortableTable, Stack } from '../../../../../components'
import useSubmitButtonExit from '../../hooks/useSubmitButtonExit'
import submitButtonStyles from '../AnswerSubmitButton.module.scss'

import styles from './AnswerSort.module.scss'

export type AnswerSortProps = {
  values: string[]
  submittedAnswer?: GameQuestionPlayerAnswerEvent
  interactive: boolean
  loading: boolean
  onSubmit: (values: string[]) => void
}

const AnswerSort: FC<AnswerSortProps> = ({
  values,
  submittedAnswer,
  interactive,
  loading,
  onSubmit,
}) => {
  const [internalValues, setInternalValues] = useState<SortableTableValue[]>(
    () =>
      values.map((value, index) => ({
        id: `${value.replace(' ', '-')}_${index}`,
        value,
      })),
  )

  useEffect(() => {
    if (submittedAnswer?.type === QuestionType.Puzzle) {
      setInternalValues(
        submittedAnswer.value.map((value, index) => ({
          id: `${value.replace(' ', '-')}_${index}`,
          value,
        })),
      )
    }
  }, [submittedAnswer])

  const disabled = useMemo(
    () => !interactive || loading || !!submittedAnswer,
    [interactive, loading, submittedAnswer],
  )
  const { shouldRender: shouldRenderSubmitButton, isExiting } =
    useSubmitButtonExit(!!submittedAnswer)

  const handleSubmit = () =>
    onSubmit(internalValues.map((value) => value.value))

  return (
    <Stack
      className={`${styles.answerSort} ${
        submittedAnswer ? styles.submitted : ''
      }`}
      spacing="compact"
      align="center"
      justify="center">
      <div className={styles.table}>
        <SortableTable
          values={internalValues}
          disabled={disabled}
          onChange={setInternalValues}
        />
      </div>

      {(interactive || !!submittedAnswer) && shouldRenderSubmitButton && (
        <div className={styles.buttonWrapper}>
          <Button
            id="submit-button"
            type="button"
            variant="primary"
            surface="brand"
            intent="accent"
            icon={faRocket}
            disabled={disabled}
            onClick={handleSubmit}
            className={`${submitButtonStyles.transition} ${
              isExiting ? submitButtonStyles.exiting : ''
            }`}
            aria-hidden={submittedAnswer ? true : undefined}>
            Submit My Answer
          </Button>
        </div>
      )}
    </Stack>
  )
}

export default AnswerSort
