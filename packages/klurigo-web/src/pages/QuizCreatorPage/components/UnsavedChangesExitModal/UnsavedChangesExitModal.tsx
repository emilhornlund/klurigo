import { type FC } from 'react'

import { Modal } from '../../../../components'
import Button from '../../../../components/Button'

import styles from './UnsavedChangesExitModal.module.scss'

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
}) => {
  return (
    <Modal title="Leave your quiz?" open>
      You have unsaved changes. If you leave now, your changes will be lost.
      <div className={styles.actions}>
        <Button
          id="cancel-button"
          type="button"
          kind="secondary"
          value="Stay"
          onClick={onReset}
        />
        <Button
          id="exit-button"
          type="button"
          kind="destructive"
          value="Leave"
          onClick={onConfirm}
        />
      </div>
    </Modal>
  )
}

export default UnsavedChangesExitModal
