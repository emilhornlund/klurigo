import { faPen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { CrittersAvatarConfigurationV1 } from '@klurigo/common'
import { type FC, type FormEvent, useState } from 'react'

import {
  Button,
  IconButtonArrowRight,
  NicknameTextField,
  PlayerAvatar,
  Stack,
  Typography,
} from '../../../../../../components'

import styles from './JoinGameForm.module.scss'

/** Inputs and callbacks for the nickname form and its avatar trigger. */
interface JoinGameFormProps {
  /** Complete design shown before the first accepted join. */
  readonly avatar?: CrittersAvatarConfigurationV1
  /** Account nickname used only when this identity's form mounts. */
  readonly initialNickname: string
  /** Blocks further edits while a save or join is in progress. */
  readonly busy: boolean
  /** The accepted identity and initial avatar are being resolved. */
  readonly preparing: boolean
  /** Unsupported saved designs remain visible but cannot be edited. */
  readonly canEdit: boolean
  /** Preparation failures block submission until retried. */
  readonly error?: string
  /** Actionable feedback from the latest failed submission. */
  readonly message?: string
  /** Opens avatar customization without submitting the form. */
  readonly onCustomize: () => void
  /** Retries preparation for this same game identity. */
  readonly onRetry: () => void
  /** Submits a validated nickname through the parent join flow. */
  readonly onSubmit: (nickname: string) => void
}

/** Keeps nickname entry mounted while the avatar dialog is open. */
const JoinGameForm: FC<JoinGameFormProps> = ({
  avatar,
  initialNickname,
  busy,
  preparing,
  canEdit,
  error,
  message,
  onCustomize,
  onRetry,
  onSubmit,
}) => {
  const [nickname, setNickname] = useState(initialNickname)
  const [valid, setValid] = useState(false)
  const disabled = busy || preparing || !!error || !avatar || !valid

  const submit = (event: FormEvent) => {
    event.preventDefault()

    if (!disabled) {
      onSubmit(nickname)
    }
  }

  return (
    <Stack
      as="form"
      width="content"
      data-testid="join-form"
      aria-label="Join game"
      aria-busy={busy || preparing}
      name="join-game-form"
      onSubmit={submit}>
      <Stack align="center" spacing="compact">
        {avatar && (
          <button
            id="customize-avatar"
            type="button"
            aria-label="Customize avatar"
            className={styles.avatarButton}
            disabled={busy || preparing || !!error || !canEdit}
            onClick={onCustomize}>
            <PlayerAvatar
              avatar={avatar}
              size={192}
              alt="Your game avatar preview"
              className={styles.avatar}
            />
            {canEdit && (
              <span className={styles.editIcon} aria-hidden="true">
                <FontAwesomeIcon icon={faPen} />
              </span>
            )}
          </button>
        )}
        {preparing && (
          <Typography variant="body2" color="inverse" role="status">
            Preparing your avatar…
          </Typography>
        )}
        {(message || error) && (
          <Typography variant="body2" color="inverse" role="alert">
            {error ?? message}
          </Typography>
        )}
        {error && (
          <Button id="retry-avatar" type="button" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Stack>
      <NicknameTextField
        value={nickname}
        placeholder="Nickname"
        disabled={busy}
        onChange={setNickname}
        onValid={setValid}
      />
      <IconButtonArrowRight
        id="join"
        type="submit"
        variant="primary"
        intent="accent"
        value="OK, Go!"
        loading={busy}
        disabled={disabled}
      />
    </Stack>
  )
}

export default JoinGameForm
