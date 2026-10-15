import { faRocket } from '@fortawesome/free-solid-svg-icons'
import type { GameQuestionPlayerAnswerEvent } from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import type { FC } from 'react'
import { useEffect, useMemo, useState } from 'react'

import {
  Button,
  PinImage,
  ResponsiveImage,
  Stack,
} from '../../../../../components'

import styles from './AnswerPin.module.scss'

export type AnswerPinProps = {
  imageURL: string
  submittedAnswer?: GameQuestionPlayerAnswerEvent
  interactive: boolean
  loading: boolean
  onSubmit: (pos: { x: number; y: number }) => void
}

const AnswerPin: FC<AnswerPinProps> = ({
  imageURL,
  submittedAnswer,
  interactive,
  loading,
  onSubmit,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0.5,
    y: 0.5,
  })

  useEffect(() => {
    if (submittedAnswer?.type !== QuestionType.Pin) return

    const [xValue, yValue, ...extraValues] = submittedAnswer.value.split(',')
    const x = Number(xValue)
    const y = Number(yValue)
    if (
      extraValues.length === 0 &&
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= 0 &&
      x <= 1 &&
      y >= 0 &&
      y <= 1
    ) {
      setPosition({ x, y })
    }
  }, [submittedAnswer])

  const disabled = useMemo(
    () => !interactive || loading || !!submittedAnswer,
    [interactive, loading, submittedAnswer],
  )

  const handleSubmit = () => {
    onSubmit(position)
  }

  if (!interactive && !submittedAnswer) {
    return (
      <div className={styles.answerPin} data-testid="pin-answer">
        <div className={styles.imageArea} data-testid="pin-image-area">
          <ResponsiveImage imageURL={imageURL} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.answerPin} data-testid="pin-answer">
      <Stack className={styles.interactive} spacing="compact" align="center">
        <div className={styles.imageArea} data-testid="pin-image-area">
          <PinImage
            value={position}
            imageURL={imageURL}
            fit="contain"
            disabled={disabled}
            onChange={setPosition}
          />
        </div>
        <div className={styles.buttonWrapper}>
          <Button
            id="submit-button"
            type="button"
            variant="primary"
            surface="brand"
            intent="accent"
            icon={faRocket}
            disabled={disabled}
            onClick={handleSubmit}>
            Submit My Pin
          </Button>
        </div>
      </Stack>
    </div>
  )
}

export default AnswerPin
