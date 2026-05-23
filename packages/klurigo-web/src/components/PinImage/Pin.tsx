import { faLocationDot } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type FC } from 'react'

import { getPinColorColor } from './pin-utils'
import styles from './PinImage.module.scss'
import { PinColor } from './types'

interface PinProps {
  width: number
  height: number
  x: number
  y: number
  toleranceSizePx?: {
    width: number
    height: number
  }
  color?: PinColor
  disabled?: boolean
}

const Pin: FC<PinProps> = ({
  width,
  height,
  x,
  y,
  toleranceSizePx,
  color = PinColor.Blue,
  disabled,
}) => (
  <div
    className={styles.pin}
    style={{
      width,
      height,
      left: `${x * 100}%`,
      top: `${y * 100}%`,
      ...(disabled ? { cursor: 'default' } : {}),
    }}>
    {toleranceSizePx && (
      <div
        className={styles.tolerance}
        style={{
          width: `${toleranceSizePx.width}px`,
          height: `${toleranceSizePx.height}px`,
        }}
      />
    )}
    <div className={styles.dot}>
      <FontAwesomeIcon icon={faLocationDot} color={getPinColorColor(color)} />
    </div>
  </div>
)

export default Pin
