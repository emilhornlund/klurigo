import {
  type CrittersAvatarConfigurationV1,
  isCrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { type FC, useMemo } from 'react'

import placeholder from '../../assets/images/avatar.svg'
import { getCrittersAvatarV1DataUri } from '../../utils/avatar/critters-v1'
import { classNames } from '../../utils/helpers'

import styles from './PlayerAvatar.module.scss'

const DEFAULT_AVATAR_SIZE = 96

export interface PlayerAvatarProps {
  readonly avatar?: CrittersAvatarConfigurationV1
  readonly size?: number
  readonly alt: string
  readonly className?: string
}

/** Image-isolated local rendering keeps SVG fragment IDs safe across multiple avatars. */
const PlayerAvatar: FC<PlayerAvatarProps> = ({
  avatar,
  size = DEFAULT_AVATAR_SIZE,
  alt,
  className,
}) => {
  const image = useMemo(
    () =>
      isCrittersAvatarConfigurationV1(avatar)
        ? { source: getCrittersAvatarV1DataUri(avatar), fallback: false }
        : { source: placeholder, fallback: true },
    [avatar],
  )
  return (
    <img
      src={image.source}
      width={size}
      height={size}
      alt={alt}
      className={classNames(
        styles.avatar,
        image.fallback ? styles.placeholder : undefined,
        className,
      )}
    />
  )
}

export default PlayerAvatar
