import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'

import { classNames } from '../../utils/helpers'

import styles from './InputError.module.scss'

export interface InputErrorProps {
  message: string
  size?: 'normal' | 'small'
  fullWidth?: boolean
}

const InputError: FC<InputErrorProps> = ({
  message,
  size = 'normal',
  fullWidth = false,
}) => (
  <div
    className={classNames(
      styles.inputError,
      size === 'small' ? styles.sizeSmall : undefined,
      fullWidth ? styles.fullWidth : undefined,
    )}>
    <FontAwesomeIcon icon={faTriangleExclamation} className={styles.icon} />
    {message}
  </div>
)

export default InputError
