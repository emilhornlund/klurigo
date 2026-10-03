import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import type { FC, ReactNode } from 'react'

import { Stack } from '../../../../../../../../../components'
import IconTooltip from '../../../../../../../../../components/IconTooltip'
import { classNames } from '../../../../../../../../../utils/helpers'

import styles from './FieldWrapper.module.scss'

export interface FieldWrapperProps {
  label?: string
  footer?: string
  layout?: 'full' | 'half'
  required?: boolean
  info?: ReactNode | ReactNode[] | string
  className?: string
  children: ReactNode
}

const FieldWrapper: FC<FieldWrapperProps> = ({
  label,
  footer,
  layout = 'full',
  required = false,
  info,
  className,
  children,
}) => (
  <Stack
    spacing="compact"
    className={classNames(
      layout === 'full' ? styles.layoutFull : styles.layoutHalf,
    )}>
    {label && (
      <Stack
        direction="horizontal"
        spacing="compact"
        align="center"
        className={styles.label}>
        <span>
          {label}
          {required && ' *'}
        </span>
        {info && <IconTooltip icon={faCircleInfo}>{info}</IconTooltip>}
      </Stack>
    )}

    <Stack width="full" spacing="compact" className={className}>
      {children}
    </Stack>
    {footer && <Stack direction="horizontal">{footer}</Stack>}
  </Stack>
)

export default FieldWrapper
