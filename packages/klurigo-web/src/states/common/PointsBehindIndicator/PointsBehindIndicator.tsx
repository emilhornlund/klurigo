import type { CrittersAvatarConfigurationV1 } from '@klurigo/common'
import type { FC } from 'react'

import { PlayerAvatar } from '../../../components'

import styles from './PointsBehindIndicator.module.scss'

export interface PointBehindIndicatorProps {
  points: number
  nickname: string
  /** Game-time design of the already-visible player ahead. */
  avatar: CrittersAvatarConfigurationV1
}

const PointBehindIndicator: FC<PointBehindIndicatorProps> = ({
  points,
  nickname,
  avatar,
}) => (
  <div className={styles.pointsBehindIndicator}>
    <strong>{points}</strong>
    {' points behind '}
    <span className={styles.identity}>
      <PlayerAvatar
        avatar={avatar}
        alt=""
        size={32}
        className={styles.avatar}
      />
      <strong>{nickname}</strong>
    </span>
  </div>
)

export default PointBehindIndicator
