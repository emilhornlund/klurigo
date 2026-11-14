import { faFloppyDisk, faRotate } from '@fortawesome/free-solid-svg-icons'
import {
  type CrittersAvatarConfigurationV1,
  deepEqual,
  DEFAULT_CRITTERS_AVATAR_V1,
  isCrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { type FC, type FormEvent, useEffect, useRef, useState } from 'react'

import {
  AvatarEditor,
  Button,
  Stack,
  Typography,
} from '../../../../../../components'
import { randomizeCrittersAvatar } from '../../../../../../utils/avatar/avatar-editor.utils'

import styles from './UserAvatarForm.module.scss'

export interface UserAvatarFormProps {
  readonly value?: CrittersAvatarConfigurationV1
  readonly loading?: boolean
  readonly onSave: (
    value: CrittersAvatarConfigurationV1,
  ) => Promise<CrittersAvatarConfigurationV1>
}

const UserAvatarForm: FC<UserAvatarFormProps> = ({
  value,
  loading = false,
  onSave,
}) => {
  const supported =
    value === undefined || isCrittersAvatarConfigurationV1(value)
  const persisted = isCrittersAvatarConfigurationV1(value)
    ? value
    : DEFAULT_CRITTERS_AVATAR_V1
  const [draft, setDraft] = useState(persisted)
  const previous = useRef(persisted)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const savingRef = useRef(false)
  const busy = loading || saving

  useEffect(() => {
    const old = previous.current
    previous.current = persisted
    setDraft((current) => (deepEqual(current, old) ? persisted : current))
  }, [persisted])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (savingRef.current || busy || !supported) return
    savingRef.current = true
    setSaving(true)
    setError(undefined)
    try {
      const saved = await onSave(draft)
      setDraft(saved)
      previous.current = saved
    } catch {
      setError(
        'We couldn’t save your avatar. Your design is still here—please try again.',
      )
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <Stack as="section" width="full" spacing="stack" className={styles.section}>
      <Typography variant="title2" align="center" color="inverse">
        Your quiz avatar
      </Typography>
      <Typography
        variant="body"
        width="medium"
        align="center"
        color="inverse"
        className={styles.description}>
        Build a little sidekick that’s uniquely you. Save your design to keep it
        with your account.
      </Typography>
      {!supported ? (
        <Typography variant="control" color="inverse" role="alert">
          This saved avatar can’t be edited by this version of Klurigo. Your
          saved design has been kept.
        </Typography>
      ) : (
        <Stack as="form" width="full" onSubmit={submit} aria-busy={busy}>
          <AvatarEditor value={draft} onChange={setDraft} disabled={busy} />
          <div className={styles.footer}>
            {error && (
              <Typography variant="body2" color="inverse" role="alert">
                {error}
              </Typography>
            )}
            <div className={styles.actions}>
              <Button
                id="randomize-avatar"
                type="button"
                variant="outline"
                icon={faRotate}
                disabled={busy}
                onClick={() => {
                  setDraft(randomizeCrittersAvatar())
                  setError(undefined)
                }}>
                Randomize
              </Button>
              <Button
                id="discard-avatar"
                type="button"
                variant="plain"
                disabled={busy || deepEqual(draft, persisted)}
                onClick={() => {
                  setDraft(persisted)
                  setError(undefined)
                }}>
                Discard changes
              </Button>
              <Button
                id="save-avatar"
                className={styles.saveAction}
                aria-label="Save avatar"
                type="submit"
                intent="accent"
                icon={faFloppyDisk}
                loading={busy}
                disabled={
                  busy || (value !== undefined && deepEqual(draft, persisted))
                }>
                Save avatar
              </Button>
            </div>
          </div>
        </Stack>
      )}
    </Stack>
  )
}

export default UserAvatarForm
