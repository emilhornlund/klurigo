import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from 'react'

import { classNames } from '../../utils/helpers'

import styles from './Stack.module.scss'

type StackDirection = 'vertical' | 'horizontal'
type StackAlignment = 'start' | 'center' | 'end' | 'stretch'
type StackJustification = 'start' | 'center' | 'end' | 'space-between'
type StackWidth = 'auto' | 'content' | 'full'
type StackSpacing = 'stack' | 'compact'

type StackProps<T extends ElementType = 'div'> = {
  as?: T
  children: ReactNode
  className?: string
  direction?: StackDirection
  align?: StackAlignment
  justify?: StackJustification
  width?: StackWidth
  spacing?: StackSpacing
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>

const Stack = <T extends ElementType = 'div'>({
  as,
  children,
  className,
  direction = 'vertical',
  align = 'stretch',
  justify = 'start',
  width = 'auto',
  spacing = 'stack',
  ...props
}: StackProps<T>) => {
  const Component = as ?? 'div'

  return (
    <Component
      className={classNames(
        styles.stack,
        styles[direction],
        styles[`spacing-${spacing}`],
        styles[`align-${align}`],
        styles[`justify-${justify}`],
        width !== 'auto' ? styles[`width-${width}`] : undefined,
        className,
      )}
      {...props}>
      {children}
    </Component>
  )
}

export default Stack
