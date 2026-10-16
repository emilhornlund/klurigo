import type { CountdownEvent, QuestionMediaEvent } from '@klurigo/common'
import {
  MediaType,
  QuestionImageRevealEffectType,
  QuestionType,
} from '@klurigo/common'
import type { FC } from 'react'
import { useMemo } from 'react'

import ResponsiveImage from '../../../components/ResponsiveImage'
import ResponsivePlayer from '../../../components/ResponsivePlayer'
import { classNames } from '../../../utils/helpers'
import QuestionMediaIndicator from '../QuestionMediaIndicator'

import styles from './QuestionMedia.module.scss'

export type QuestionMediaProps = {
  type: QuestionType
  media?: QuestionMediaEvent
  alt?: string
  countdown?: CountdownEvent
  className?: string
  mediaPresentation?: 'default' | 'player'
}

const QuestionMedia: FC<QuestionMediaProps> = ({
  type,
  media,
  alt,
  countdown,
  className,
  mediaPresentation = 'default',
}) => {
  const imageURL = useMemo(() => {
    if (type !== QuestionType.Pin && media?.type === MediaType.Image) {
      return media.url
    }
    return null
  }, [type, media])

  const imageRevealEffect = useMemo<
    QuestionImageRevealEffectType | undefined
  >(() => {
    if (type !== QuestionType.Pin && media?.type === MediaType.Image) {
      return media.effect
    }
    return undefined
  }, [type, media])

  const audioOrVideoMedia = useMemo(() => {
    if (
      type !== QuestionType.Pin &&
      (media?.type === MediaType.Audio || media?.type === MediaType.Video)
    ) {
      return media
    }
    return null
  }, [type, media])

  const audioOrVideoURL = audioOrVideoMedia?.url ?? null

  if (!imageURL && !audioOrVideoURL) return null

  return (
    <div
      className={classNames(styles.questionMedia, className)}
      data-testid="question-media">
      {imageURL && (
        <ResponsiveImage
          imageURL={imageURL}
          alt={alt}
          fit="fill"
          {...(imageRevealEffect
            ? { revealEffect: { type: imageRevealEffect, countdown } }
            : {})}
        />
      )}
      {audioOrVideoMedia &&
        (mediaPresentation === 'player' ? (
          <QuestionMediaIndicator type={audioOrVideoMedia.type} />
        ) : (
          <ResponsivePlayer
            url={audioOrVideoMedia.url}
            type={audioOrVideoMedia.type}
          />
        ))}
    </div>
  )
}

export default QuestionMedia
