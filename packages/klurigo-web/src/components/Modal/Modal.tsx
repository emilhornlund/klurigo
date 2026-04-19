import {
  FloatingFocusManager,
  FloatingOverlay,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import type { FC, ReactNode } from 'react'
import { useId } from 'react'

import { classNames } from '../../utils/helpers'
import Button from '../Button'
import Typography from '../Typography'

import styles from './Modal.module.scss'

export interface ModalProps {
  title: string
  size?: 'normal' | 'large'
  open?: boolean
  onClose?: () => void
  children?: ReactNode | ReactNode[]
}

const Modal: FC<ModalProps> = ({
  title,
  size = 'normal',
  open = false,
  onClose,
  children,
}) => {
  const { refs, context } = useFloating({
    open,
  })

  const click = useClick(context)
  const dismiss = useDismiss(context, {
    outsidePressEvent: 'mousedown',
  })
  const role = useRole(context)

  const { getFloatingProps } = useInteractions([click, dismiss, role])

  const titleId = useId()

  if (!open) {
    return null
  }

  return (
    <FloatingOverlay lockScroll className={styles.floatingOverlay}>
      <FloatingFocusManager context={context}>
        <div
          aria-labelledby={titleId}
          className={classNames(
            styles.modalContainer,
            size === 'normal' ? styles.sizeNormal : undefined,
            size === 'large' ? styles.sizeLarge : undefined,
          )}
          ref={refs.setFloating}
          {...getFloatingProps()}>
          <div className={styles.header}>
            <Typography
              id={titleId}
              variant="title4"
              align="left"
              color="default"
              noOpacity>
              {title}
            </Typography>
            {onClose && (
              <Button
                id="close-modal-button"
                type="button"
                kind="plain"
                icon={faXmark}
                iconColor="gray"
                onClick={onClose}
              />
            )}
          </div>
          <div className={styles.content}>{children}</div>
        </div>
      </FloatingFocusManager>
    </FloatingOverlay>
  )
}

export default Modal
