import {
  faRetweet,
  faTrash,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import type { QuestionMediaDto } from '@klurigo/common'
import { MediaType, QuestionImageRevealEffectType } from '@klurigo/common'
import type { FC } from 'react'
import { useMemo, useState } from 'react'

import {
  Button,
  MediaModal,
  ResponsiveImage,
  ResponsivePlayer,
} from '../../../../../../../../../components'
import type { RevealEffect } from '../../../../../../../../../components/ResponsiveImage'
import colors from '../../../../../../../../../styles/colors.tokens.module.scss'
import type { QuizQuestionValidationResult } from '../../../../../../../utils/QuestionDataSource'
import { getValidationErrorMessage } from '../../../../../../../validation-rules'
import { EmptyMediaField } from '../../shared'

import { ImageEffectModal } from './components'
import styles from './MediaQuestionField.module.scss'

export interface MediaQuestionFieldProps {
  value?: QuestionMediaDto
  duration?: number
  validation: QuizQuestionValidationResult
  onChange: (value?: QuestionMediaDto) => void
}

const MediaQuestionField: FC<MediaQuestionFieldProps> = ({
  value,
  duration,
  validation,
  onChange,
}) => {
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [mediaType, setMediaType] = useState<MediaType | undefined>()
  const [showImageEffectModal, setShowImageEffectModal] = useState(false)

  const handleAddMedia = (type?: MediaType) => {
    setMediaType(type)
    setShowMediaModal(true)
  }

  const handleDelete = () => {
    onChange(undefined)
  }

  const onChangeImageEffect = (
    effect: QuestionImageRevealEffectType | undefined,
  ) => {
    if (!value) return
    onChange({
      ...value,
      ...(value.type === MediaType.Image ? { effect } : {}),
    })
  }

  const revealEffect = useMemo<RevealEffect | undefined>(() => {
    if (value?.type !== MediaType.Image || !value.effect || !duration) {
      return undefined
    }
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    return {
      type: value.effect,
      countdown: {
        initiatedTime: new Date(now).toISOString(),
        expiryTime: new Date(now + duration * 1000).toISOString(),
        serverTime: new Date(now).toISOString(),
      },
    }
  }, [value, duration])

  return (
    <>
      <div className={styles.mediaQuestionField}>
        {value ? (
          <div className={styles.previewWrapper}>
            <div className={styles.preview}>
              {value.type === MediaType.Image && (
                <ResponsiveImage
                  imageURL={value.url}
                  {...(value.effect ? { revealEffect } : {})}
                  borderColor={colors.colorBorderMuted}
                />
              )}
              {(value.type === MediaType.Video ||
                value.type === MediaType.Audio) && (
                <ResponsivePlayer
                  url={value.url}
                  grow={false}
                  playing={false}
                />
              )}
            </div>
            <div className={styles.actions}>
              <Button
                id="delete-media-button"
                type="button"
                variant="primary"
                surface="brand"
                intent="danger"
                size="small"
                value="Delete"
                hideValue="mobile"
                icon={faTrash}
                onClick={handleDelete}
              />
              <Button
                id="replace-media-button"
                type="button"
                variant="primary"
                surface="brand"
                intent="accent"
                size="small"
                value="Replace"
                hideValue="mobile"
                icon={faRetweet}
                onClick={() => handleAddMedia(value.type)}
              />
              {value.type === MediaType.Image && (
                <Button
                  id="add-image-effect-button"
                  type="button"
                  variant="primary"
                  surface="brand"
                  intent="default"
                  size="small"
                  value="Image Effect"
                  hideValue="mobile"
                  icon={faWandMagicSparkles}
                  onClick={() => setShowImageEffectModal(true)}
                />
              )}
            </div>
          </div>
        ) : (
          <EmptyMediaField
            variant="media"
            title="Add media to question"
            description="Click to choose media"
            onAddImage={() => handleAddMedia(MediaType.Image)}
            onAddVideo={() => handleAddMedia(MediaType.Video)}
            onAddAudio={() => handleAddMedia(MediaType.Audio)}
            onClick={() => handleAddMedia()}
          />
        )}
      </div>
      {showMediaModal && (
        <MediaModal
          type={value?.type ?? mediaType}
          lockedType={mediaType !== undefined}
          url={value?.url}
          customErrorMessages={{
            type: getValidationErrorMessage(validation, 'media.type'),
            url: getValidationErrorMessage(validation, 'media.url'),
          }}
          onChange={onChange}
          onClose={() => {
            setShowMediaModal(false)
            setMediaType(undefined)
          }}
        />
      )}
      {value?.type === MediaType.Image && showImageEffectModal && (
        <ImageEffectModal
          value={value.effect}
          validation={validation}
          onClose={() => setShowImageEffectModal(false)}
          onChangeImageEffect={onChangeImageEffect}
        />
      )}
    </>
  )
}

export default MediaQuestionField
