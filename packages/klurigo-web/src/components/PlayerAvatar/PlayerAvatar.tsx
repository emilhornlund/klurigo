import {
  type CrittersAvatarConfigurationV1,
  DEFAULT_CRITTERS_AVATAR_V1,
  isCrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { type FC, useMemo } from 'react'

import { getCrittersAvatarV1DataUri } from '../../utils/avatar/critters-v1'
import { classNames } from '../../utils/helpers'

import styles from './PlayerAvatar.module.scss'

const DEFAULT_AVATAR_SIZE = 96

/** Accessible local image rendering for supported avatar metadata or the default. */
export interface PlayerAvatarProps {
  /** Complete configuration; missing or unsupported metadata uses the stable default. */
  readonly avatar?: CrittersAvatarConfigurationV1
  /** Intrinsic square image size; responsive layouts may constrain it with CSS. */
  readonly size?: number
  /** Accessible identity label, or an empty string when adjacent text names it. */
  readonly alt: string
  /** Consumer-owned sizing or layout class. */
  readonly className?: string
}

/** Image-isolated local rendering keeps SVG fragment IDs safe across multiple avatars. */
const PlayerAvatar: FC<PlayerAvatarProps> = ({
  avatar,
  size = DEFAULT_AVATAR_SIZE,
  alt,
  className,
}) => {
  const source = useMemo(
    () =>
      getCrittersAvatarV1DataUri(
        isCrittersAvatarConfigurationV1(avatar)
          ? avatar
          : DEFAULT_CRITTERS_AVATAR_V1,
      ),
    [avatar],
  )
  return (
    <img
      src={source}
      width={size}
      height={size}
      alt={alt}
      className={classNames(styles.avatar, className)}
    />
  )
}

export default PlayerAvatar
