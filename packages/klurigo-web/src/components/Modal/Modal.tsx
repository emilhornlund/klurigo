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
import Button, { type ButtonProps } from '../Button'
import Stack from '../Stack'
import Typography from '../Typography'

import styles from './Modal.module.scss'

export interface ModalProps {
  title: string
  size?: 'normal' | 'large'
  open?: boolean
  closeAction?: ModalCloseAction
  primaryAction?: ModalPrimaryAction
  children?: ReactNode | ReactNode[]
}

export interface ModalCloseAction {
  label?: string
  onClick: () => void
}

export interface ModalPrimaryAction {
  label: string
  intent?: ButtonProps['intent']
  disabled?: boolean
  loading?: boolean
  onClick: () => void
}

const Modal: FC<ModalProps> = ({
  title,
  size = 'normal',
  open = false,
  closeAction,
  primaryAction,
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
            <Typography id={titleId} variant="title4" noOpacity>
              {title}
            </Typography>

            {closeAction && (
              <Button
                id="close-modal-button"
                type="button"
                variant="plain"
                surface="brand"
                icon={faXmark}
                iconColor="gray"
                onClick={closeAction.onClick}
              />
            )}
          </div>

          <Stack className={styles.content}>{children}</Stack>

          {(closeAction?.label || primaryAction) && (
            <div className={styles.actions}>
              {closeAction?.label && (
                <Button
                  id="modal-close-action-button"
                  type="button"
                  variant="outline"
                  surface="light"
                  size="small"
                  value={closeAction.label}
                  onClick={closeAction.onClick}
                  grow
                />
              )}

              {primaryAction && (
                <Button
                  id="modal-primary-action-button"
                  type="button"
                  variant="primary"
                  surface="light"
                  intent={primaryAction.intent ?? 'default'}
                  size="small"
                  value={primaryAction.label}
                  disabled={primaryAction.disabled}
                  loading={primaryAction.loading}
                  onClick={primaryAction.onClick}
                  grow
                />
              )}
            </div>
          )}
        </div>
      </FloatingFocusManager>
    </FloatingOverlay>
  )
}

export default Modal
