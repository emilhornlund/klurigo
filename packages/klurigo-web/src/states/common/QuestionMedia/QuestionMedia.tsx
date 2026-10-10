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

import styles from './QuestionMedia.module.scss'

export type QuestionMediaProps = {
  type: QuestionType
  media?: QuestionMediaEvent
  alt?: string
  countdown?: CountdownEvent
}

const QuestionMedia: FC<QuestionMediaProps> = ({
  type,
  media,
  alt,
  countdown,
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

  const audioOrVideoURL = useMemo(() => {
    if (
      type !== QuestionType.Pin &&
      (media?.type === MediaType.Audio || media?.type === MediaType.Video)
    ) {
      return media?.url
    }
    return null
  }, [type, media])

  if (!imageURL && !audioOrVideoURL) return null

  return (
    <div className={styles.questionMedia} data-testid="question-media">
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
      {audioOrVideoURL && <ResponsivePlayer url={audioOrVideoURL} />}
    </div>
  )
}

export default QuestionMedia
