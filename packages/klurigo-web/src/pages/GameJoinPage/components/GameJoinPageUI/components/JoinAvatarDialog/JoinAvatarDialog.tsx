import {
  type CrittersAvatarConfigurationV1,
  randomizeCrittersAvatar,
} from '@klurigo/common'
import { type FC, useState } from 'react'

import { AvatarEditor, Modal } from '../../../../../../components'

/** A temporary editor whose changes are applied only by the primary action. */
interface JoinAvatarDialogProps {
  /** Design copied into the dialog when it opens. */
  readonly avatar: CrittersAvatarConfigurationV1
  /** Applies the chosen design to the join draft without saving a profile. */
  readonly onApply: (avatar: CrittersAvatarConfigurationV1) => void
  /** Discards dialog-local changes, including on Escape or backdrop dismissal. */
  readonly onClose: () => void
}

/** Changes stay inside the dialog until the player explicitly uses the design. */
const JoinAvatarDialog: FC<JoinAvatarDialogProps> = ({
  avatar,
  onApply,
  onClose,
}) => {
  const [draft, setDraft] = useState(avatar)

  return (
    <Modal
      title="Customize avatar"
      size="large"
      open
      closeAction={{ label: 'Discard changes', onClick: onClose }}
      primaryAction={{
        label: 'Use design',
        intent: 'accent',
        onClick: () => onApply(draft),
      }}>
      <AvatarEditor
        value={draft}
        onChange={setDraft}
        presentation="dialog"
        onRandomize={() => setDraft(randomizeCrittersAvatar())}
      />
    </Modal>
  )
}

export default JoinAvatarDialog
