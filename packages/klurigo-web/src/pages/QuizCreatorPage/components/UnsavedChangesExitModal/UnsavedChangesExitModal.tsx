import { type FC } from 'react'

import { ConfirmDialog } from '../../../../components'

/**
 * Props for the UnsavedChangesExitModal component.
 */
export type UnsavedChangesExitModalProps = {
  onReset: () => void
  onConfirm: () => void
}

/**
 * Modal that confirms whether the user wants to leave and discard unsaved changes.
 */
const UnsavedChangesExitModal: FC<UnsavedChangesExitModalProps> = ({
  onReset,
  onConfirm,
}) => (
  <ConfirmDialog
    title="Leave your quiz?"
    message="You have unsaved changes. If you leave now, your changes will be lost."
    confirmTitle="Leave"
    closeTitle="Stay"
    onConfirm={onConfirm}
    onClose={onReset}
    destructive
    open
  />
)

export default UnsavedChangesExitModal
