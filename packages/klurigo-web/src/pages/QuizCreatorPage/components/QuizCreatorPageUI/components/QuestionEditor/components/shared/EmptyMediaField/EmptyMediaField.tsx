import {
  faImage,
  faPhotoFilm,
  faVideo,
  faVolumeHigh,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'

import {
  Button,
  InputError,
  Stack,
} from '../../../../../../../../../components'

import styles from './EmptyMediaField.module.scss'

export interface EmptyMediaFieldProps {
  variant: 'media' | 'image'
  title: string
  description: string
  errorMessage?: string
  onClick: () => void
  onAddImage?: () => void
  onAddVideo?: () => void
  onAddAudio?: () => void
}
const EmptyMediaField: FC<EmptyMediaFieldProps> = ({
  variant,
  title,
  description,
  errorMessage,
  onClick,
  onAddImage,
  onAddVideo,
  onAddAudio,
}) => (
  <div className={styles.emptyMedia}>
    {variant === 'media' && (
      <Stack direction="horizontal" spacing="compact">
        <Button
          id="add-image-button"
          type="button"
          size="small"
          variant="primary"
          surface="light"
          value="Add image"
          icon={faImage}
          onClick={onAddImage}
        />

        <Button
          id="add-video-button"
          type="button"
          size="small"
          variant="primary"
          surface="light"
          value="Add video"
          icon={faVideo}
          onClick={onAddVideo}
        />

        <Button
          id="add-audio-button"
          type="button"
          size="small"
          variant="primary"
          surface="light"
          value="Add audio"
          icon={faVolumeHigh}
          onClick={onAddAudio}
        />
      </Stack>
    )}

    <button
      id="empty-media-button"
      type="button"
      className={styles.emptyMediaArea}
      onClick={onClick}>
      <FontAwesomeIcon icon={faPhotoFilm} className={styles.emptyMediaIcon} />

      <span className={styles.emptyMediaTitle}>{title}</span>

      <span className={styles.emptyMediaDescription}>{description}</span>
    </button>

    {errorMessage && (
      <div className={styles.error}>
        <InputError message={errorMessage} />
      </div>
    )}
  </div>
)

export default EmptyMediaField
