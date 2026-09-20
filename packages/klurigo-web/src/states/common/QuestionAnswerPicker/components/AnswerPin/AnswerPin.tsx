import { faRocket } from '@fortawesome/free-solid-svg-icons'
import type { GameQuestionPlayerAnswerEvent } from '@klurigo/common'
import type { FC } from 'react'
import { useMemo, useState } from 'react'

import { Button, PinImage, ResponsiveImage } from '../../../../../components'

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

  const disabled = useMemo(
    () => !interactive || loading || !!submittedAnswer,
    [interactive, loading, submittedAnswer],
  )

  const handleSubmit = () => {
    onSubmit(position)
  }

  if (!interactive && !submittedAnswer) {
    return (
      <div className={styles.answerPin}>
        <ResponsiveImage imageURL={imageURL} />
      </div>
    )
  }

  return (
    <div className={styles.answerPin}>
      <div className={styles.interactive}>
        <PinImage
          value={position}
          imageURL={imageURL}
          disabled={disabled}
          onChange={setPosition}
        />
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
      </div>
    </div>
  )
}

export default AnswerPin
