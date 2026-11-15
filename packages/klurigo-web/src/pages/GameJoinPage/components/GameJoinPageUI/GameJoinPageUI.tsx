import type { CrittersAvatarConfigurationV1 } from '@klurigo/common'
import { type FC, useState } from 'react'

import UsersIcon from '../../../../assets/images/users-icon.svg'
import {
  CallToActionCard,
  IconButtonArrowLeft,
  Page,
  PageProminentIcon,
  RotatingMessage,
  Typography,
} from '../../../../components'
import { MESSAGES, TITLES } from '../../text.utils'

import { JoinAvatarDialog, JoinGameForm } from './components'

/** Presentation state and actions supplied by the join page's orchestration. */
export interface GameJoinPageUIProps {
  /** Complete applied design, absent while preparation has not succeeded. */
  readonly avatar?: CrittersAvatarConfigurationV1
  /** Account nickname used when the identity-scoped form mounts. */
  readonly initialNickname: string
  /** Controls the existing guest login prompt. */
  readonly isUserAuthenticated: boolean
  /** Disables edits during profile saving or game acceptance. */
  readonly busy: boolean
  /** Initial identity and design are still being resolved. */
  readonly preparing: boolean
  /** Unsupported saved metadata remains visible without opening the editor. */
  readonly canEdit: boolean
  /** Preparation failure that prevents submission. */
  readonly error?: string
  /** Actionable feedback from a failed save or join. */
  readonly message?: string
  /** Leaves the current game-authentication flow. */
  readonly onBack: () => void
  /** Opens account login from the existing guest prompt. */
  readonly onLogin: () => void
  /** Retries preparation without changing the signed identity. */
  readonly onRetry: () => void
  /** Submits the validated nickname. */
  readonly onSubmit: (nickname: string) => void
  /** Applies a dialog choice to the join draft without saving a profile. */
  readonly onAvatarChange: (avatar: CrittersAvatarConfigurationV1) => void
}

/** Renders the join layout and owns only the customization dialog's visibility. */
const GameJoinPageUI: FC<GameJoinPageUIProps> = ({
  avatar,
  initialNickname,
  isUserAuthenticated,
  busy,
  preparing,
  canEdit,
  error,
  message,
  onBack,
  onLogin,
  onRetry,
  onSubmit,
  onAvatarChange,
}) => {
  const [editing, setEditing] = useState(false)

  return (
    <Page
      layout="contained"
      align="center"
      header={
        <IconButtonArrowLeft
          id="back-button"
          type="button"
          variant="primary"
          intent="accent"
          size="small"
          value="Back"
          onClick={onBack}
        />
      }
      hideLogin>
      <PageProminentIcon src={UsersIcon} alt="Users" />
      <RotatingMessage
        messages={TITLES}
        renderMessage={(title) => (
          <Typography
            variant="title"
            width="medium"
            align="center"
            color="inverse">
            {title}
          </Typography>
        )}
      />
      <RotatingMessage
        messages={MESSAGES}
        renderMessage={(message) => (
          <Typography
            variant="body"
            width="small"
            align="center"
            color="inverse">
            {message}
          </Typography>
        )}
      />
      {!isUserAuthenticated && (
        <CallToActionCard
          title="Make every game count"
          text="Anonymous play doesn’t keep history. Login to track stats, build quizzes, and host your own live games."
          onClick={onLogin}
        />
      )}
      <JoinGameForm
        avatar={avatar}
        initialNickname={initialNickname}
        busy={busy}
        preparing={preparing}
        canEdit={canEdit}
        error={error}
        message={message}
        onCustomize={() => setEditing(true)}
        onRetry={onRetry}
        onSubmit={onSubmit}
      />
      {editing && avatar && (
        <JoinAvatarDialog
          avatar={avatar}
          onClose={() => setEditing(false)}
          onApply={(design) => {
            onAvatarChange(design)
            setEditing(false)
          }}
        />
      )}
    </Page>
  )
}

export default GameJoinPageUI
