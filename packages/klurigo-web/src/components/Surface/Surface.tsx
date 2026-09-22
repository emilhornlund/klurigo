import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

import { classNames } from '../../utils/helpers'

import styles from './Surface.module.scss'

type SurfaceOwnProps = {
  /** Enables hover, focus, and active surface states. */
  readonly interactive?: boolean
  /** Additional consumer-specific classes. */
  readonly className?: string
  readonly children?: ReactNode
}

export type SurfaceProps<T extends ElementType = 'div'> = SurfaceOwnProps & {
  readonly as?: T
} & Omit<ComponentPropsWithoutRef<T>, keyof SurfaceOwnProps | 'as'>

/**
 * Provides the shared surface background, border, and shadow treatment.
 *
 * Surfaces are non-interactive by default. Use `interactive` only for a
 * surface that has an explicit hover or activation behavior.
 */
const Surface = <T extends ElementType = 'div'>({
  as,
  interactive = false,
  className,
  children,
  ...props
}: SurfaceProps<T>) => {
  const Component = (as ?? 'div') as ElementType

  return (
    <Component
      className={classNames(
        styles.surface,
        interactive ? styles.interactive : undefined,
        className,
      )}
      {...props}>
      {children}
    </Component>
  )
}

export default Surface
