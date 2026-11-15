import type { IconDefinition } from '@fortawesome/fontawesome-common-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC, ReactNode } from 'react'

import { classNames } from '../../utils/helpers'

import styles from './MediaInfoCard.module.scss'

/**
 * Props for the CardInfoItem component.
 */
export type CardInfoItemProps = {
  /** Optional icon displayed before the content. */
  readonly icon?: IconDefinition
  /** Optional color applied to the icon. */
  readonly iconColor?: string
  /** Optional size variant for the rendered item. */
  readonly size?: 'normal' | 'small'
  /** Optional tooltip text shown on hover. */
  readonly title?: string
  /** Optional consumer-owned layout class. */
  readonly className?: string
  /** Content rendered inside the item. */
  readonly children: ReactNode
  /** Optional test id for the rendered element. */
  readonly 'data-testid'?: string
}

/**
 * Renders a compact information item for use inside a media info card.
 */
const CardInfoItem: FC<CardInfoItemProps> = ({
  icon,
  iconColor,
  size,
  title,
  className,
  children,
  'data-testid': dataTestId,
}) => {
  return (
    <span
      className={classNames(
        styles.infoItem,
        size === 'small' ? styles.infoItemSmall : undefined,
        className,
      )}
      title={title}
      data-testid={dataTestId}>
      {icon && <FontAwesomeIcon icon={icon} color={iconColor} />}
      {children}
    </span>
  )
}

export default CardInfoItem
