import { faRocket } from '@fortawesome/free-solid-svg-icons'
import type { GameQuestionPlayerAnswerEvent } from '@klurigo/common'
import type { ChangeEvent, FC, FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { Button, TextField } from '../../../../../components'
import { isValidNumber } from '../../../../../utils/helpers'
import NonInteractiveInfoBox from '../../../NonInteractiveInfoBox'

import styles from './AnswerRange.module.scss'

export interface AnswerRangeProps {
  min: number
  max: number
  step: number
  submittedAnswer?: GameQuestionPlayerAnswerEvent
  interactive: boolean
  loading: boolean
  onSubmit: (value: number) => void
}

const AnswerRange: FC<AnswerRangeProps> = ({
  min,
  max,
  step,
  submittedAnswer,
  interactive,
  loading,
  onSubmit,
}) => {
  const [value, setValue] = useState<number>(Math.floor(min + (max - min) / 2))
  const [valid, setValid] = useState<boolean>(false)

  const disabled = useMemo(
    () => !interactive || loading || !!submittedAnswer,
    [interactive, loading, submittedAnswer],
  )

  const handleSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(event.target.value, 10)
      setValue(newValue)
      setValid(isValidNumber(newValue, min, max))
    },
    [min, max],
  )

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      if (valid) {
        onSubmit(value)
      }
    },
    [onSubmit, valid, value],
  )

  if (!interactive && !submittedAnswer) {
    return (
      <div className={styles.answerRange}>
        <div style={{ display: 'flex', flex: 1 }} />
        <NonInteractiveInfoBox
          info={`Pick an answer between ${min} and ${max} on your screen`}
        />
      </div>
    )
  }

  return (
    <div className={styles.answerRange}>
      <div className={styles.interactive}>
        <form onSubmit={handleSubmit}>
          <input
            id="slider-range"
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={handleSliderChange}
          />
          <TextField
            id="slider-input"
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(newValue) => setValue(newValue as number)}
            onValid={setValid}
            disabled={disabled}
            required
          />
          <Button
            id="submit-button"
            type="submit"
            variant="primary"
            surface="brand"
            intent="accent"
            icon={faRocket}
            disabled={disabled || !valid}>
            Submit My Answer
          </Button>
        </form>
      </div>
    </div>
  )
}

export default AnswerRange
