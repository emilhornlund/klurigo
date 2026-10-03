import type { ElementType, HTMLAttributes, ReactNode } from 'react'

import { Typography } from '../../../../../../components'
import { classNames } from '../../../../../../utils/helpers'

import styles from './EditorPanel.module.scss'

export interface EditorPanelProps extends HTMLAttributes<HTMLElement> {
  title?: string
  children: ReactNode
  className?: string
  contentClassName?: string
  as?: ElementType
}

const EditorPanel = ({
  title,
  children,
  className,
  contentClassName,
  as: Component = 'section',
  ...props
}: EditorPanelProps) => (
  <Component className={classNames(styles.editorPanel, className)} {...props}>
    {title && (
      <Typography variant="title5" align="left" noOpacity bold>
        {title}
      </Typography>
    )}

    <div className={classNames(styles.content, contentClassName)}>
      {children}
    </div>
  </Component>
)

export default EditorPanel
