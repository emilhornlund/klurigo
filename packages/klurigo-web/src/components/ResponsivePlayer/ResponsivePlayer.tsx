import { MediaType } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'
import ReactPlayer from 'react-player'

import styles from './ResponsivePlayer.module.scss'

export interface ResponsivePlayerProps {
  url: string
  playing?: boolean
  grow?: boolean
  type?: MediaType
}

const ResponsivePlayer: FC<ResponsivePlayerProps> = ({
  url,
  playing = true,
  grow = true,
  type,
}) => {
  const sourceKey = JSON.stringify([url, type])

  return (
    <div className={styles.playerWrapper}>
      <ResponsivePlayerContent
        key={sourceKey}
        url={url}
        type={type}
        playing={playing}
        grow={grow}
      />
    </div>
  )
}

const ResponsivePlayerContent: FC<ResponsivePlayerProps> = ({
  url,
  playing = true,
  grow = true,
  type,
}) => {
  const [hasPlaybackError, setHasPlaybackError] = useState(false)

  if (hasPlaybackError) {
    return (
      <div role="status" className={styles.errorMessage}>
        {type === MediaType.Audio
          ? 'Audio unavailable'
          : type === MediaType.Video
            ? 'Video unavailable'
            : 'Media unavailable'}
      </div>
    )
  }

  return (
    <ReactPlayer
      src={url}
      muted={false}
      width={grow ? '100%' : undefined}
      height={grow ? '100%' : undefined}
      playing={playing}
      loop
      controls
      onError={() => setHasPlaybackError(true)}
    />
  )
}

export default ResponsivePlayer
