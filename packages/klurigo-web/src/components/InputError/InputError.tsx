import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'

import { classNames } from '../../utils/helpers'

import styles from './InputError.module.scss'

export interface InputErrorProps {
  message: string
  size?: 'normal' | 'small'
}

const InputError: FC<InputErrorProps> = ({ message, size = 'normal' }) => (
  <div
    className={classNames(
      styles.inputError,
      size === 'small' ? styles.sizeSmall : undefined,
    )}>
    <FontAwesomeIcon icon={faTriangleExclamation} className={styles.icon} />
    {message}
  </div>
)

export default InputError
