import type { FC } from 'react'

import Modal from '../Modal'
import Typography from '../Typography'

export interface ConfirmDialogProps {
  title: string
  message: string
  open?: boolean
  destructive?: boolean
  confirmTitle?: string
  closeTitle?: string
  loading?: boolean
  onConfirm?: () => void
  onClose?: () => void
}

const ConfirmDialog: FC<ConfirmDialogProps> = ({
  title,
  message,
  open = false,
  destructive = false,
  confirmTitle = 'Confirm',
  closeTitle = 'Close',
  loading = false,
  onConfirm,
  onClose,
}) => (
  <Modal
    title={title}
    open={open}
    closeAction={{ label: closeTitle, onClick: () => onClose?.() }}
    primaryAction={{
      label: confirmTitle,
      ...(destructive && { intent: 'danger' }),
      loading,
      onClick: () => onConfirm?.(),
    }}>
    <Typography variant="body2" noOpacity>
      {message}
    </Typography>
  </Modal>
)

export default ConfirmDialog
