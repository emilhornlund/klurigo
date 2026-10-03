import type { ComponentPropsWithRef, FC, ReactNode } from 'react'

import { InputError } from '../../../../../../../../../../components'
import { classNames } from '../../../../../../../../../../utils/helpers'

import styles from './AnswerOptionList.module.scss'

export const AnswerOptionList: FC<{ children: ReactNode }> = ({ children }) => (
  <div className={styles.optionsContainer}>{children}</div>
)

export const AnswerOptionRow: FC<
  ComponentPropsWithRef<'div'> & { dragging?: boolean }
> = ({ dragging, className, ...props }) => (
  <div
    {...props}
    className={classNames(
      styles.option,
      dragging ? styles.dragging : undefined,
      className,
    )}
  />
)

export const AnswerOptionGroupError: FC<{ message: string }> = ({
  message,
}) => (
  <div className={styles.groupError}>
    <div className={styles.groupErrorContent}>
      <InputError message={message} fullWidth />
    </div>
  </div>
)
