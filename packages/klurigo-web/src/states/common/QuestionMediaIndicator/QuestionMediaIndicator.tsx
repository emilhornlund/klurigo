import { faVideo, faVolumeHigh } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { MediaType } from '@klurigo/common'
import type { FC } from 'react'

import { classNames } from '../../../utils/helpers'

import styles from './QuestionMediaIndicator.module.scss'

export type QuestionMediaIndicatorProps = {
  type: MediaType.Audio | MediaType.Video
}

const QuestionMediaIndicator: FC<QuestionMediaIndicatorProps> = ({ type }) => {
  const isAudio = type === MediaType.Audio
  const accessibleLabel = isAudio ? 'Audio question' : 'Video question'
  const label = isAudio ? 'Listen up!' : 'Eyes on the big screen!'
  const instruction = isAudio
    ? 'The sound is coming from the host!'
    : 'The host has the video!'

  return (
    <div
      className={classNames(
        styles.questionMediaIndicator,
        styles.iconAnimation,
      )}
      role="group"
      aria-label={accessibleLabel}>
      <FontAwesomeIcon
        className={styles.icon}
        icon={isAudio ? faVolumeHigh : faVideo}
        aria-hidden="true"
      />
      <p className={styles.label}>{label}</p>
      <p className={styles.instruction}>{instruction}</p>
    </div>
  )
}

export default QuestionMediaIndicator
