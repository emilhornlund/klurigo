import type { IconDefinition } from '@fortawesome/fontawesome-common-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type FC, type ReactNode, useMemo } from 'react'

import { DeviceType } from '../../utils/device-size.types'
import { classNames } from '../../utils/helpers'
import { useDeviceSizeType } from '../../utils/useDeviceSizeType'

import styles from './Button.module.scss'

export interface ButtonProps {
  id: string
  name?: string
  type: 'submit' | 'reset' | 'button'
  variant?: 'primary' | 'outline' | 'plain'
  surface?: 'brand' | 'light'
  intent?: 'default' | 'accent' | 'danger' | 'success'
  size?: 'normal' | 'small'
  grow?: boolean
  value?: ReactNode | string | undefined
  hideValue?: 'mobile' | 'never'
  disabled?: boolean
  loading?: boolean
  icon?: IconDefinition
  iconPosition?: 'leading' | 'trailing'
  iconColor?: string
  onClick?: () => void
  children?: ReactNode
}

const Button: FC<ButtonProps> = ({
  id,
  name,
  type,
  variant = 'primary',
  surface = 'brand',
  intent = 'default',
  size = 'normal',
  grow,
  value,
  hideValue = 'never',
  disabled,
  loading,
  icon,
  iconPosition = 'leading',
  iconColor,
  onClick,
  children,
}) => {
  const deviceType = useDeviceSizeType()

  const showValue = useMemo(() => {
    if (hideValue === 'mobile' && deviceType === DeviceType.Mobile) {
      return false
    }

    return !!value || !!children
  }, [value, children, deviceType, hideValue])

  return (
    <div
      className={classNames(
        styles.buttonContainer,
        variant === 'primary' ? styles.variantPrimary : undefined,
        variant === 'outline' ? styles.variantOutline : undefined,
        variant === 'plain' ? styles.variantPlain : undefined,
        surface === 'brand' ? styles.surfaceBrand : undefined,
        surface === 'light' ? styles.surfaceLight : undefined,
        intent === 'default' ? styles.intentDefault : undefined,
        intent === 'accent' ? styles.intentAccent : undefined,
        intent === 'danger' ? styles.intentDanger : undefined,
        intent === 'success' ? styles.intentSuccess : undefined,
        size === 'small' ? styles.sizeSmall : undefined,
        grow ? styles.grow : undefined,
      )}>
      <button
        id={id}
        name={name ?? id}
        type={type}
        disabled={loading || disabled}
        onClick={onClick}
        data-testid={`test-${id}-button`}>
        {loading ? (
          <div className={styles.loadingSpinner}>
            <div></div>
            <div></div>
            <div></div>
          </div>
        ) : (
          <>
            {icon && iconPosition === 'leading' && (
              <FontAwesomeIcon icon={icon} color={iconColor} />
            )}

            {showValue && <span>{children || value}</span>}

            {icon && iconPosition === 'trailing' && (
              <FontAwesomeIcon icon={icon} color={iconColor} />
            )}
          </>
        )}
      </button>
    </div>
  )
}

export default Button
