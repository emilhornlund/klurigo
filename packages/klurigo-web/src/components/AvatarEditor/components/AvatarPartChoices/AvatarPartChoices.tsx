import {
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { type FC, useId } from 'react'

import { avatarChoiceLabel } from '../../../../utils/avatar/avatar-editor.utils'
import PlayerAvatar from '../../../PlayerAvatar'
import Surface from '../../../Surface'
import styles from '../../AvatarEditor.module.scss'

/** Options for editing one artwork part while preserving the rest of the design. */
interface AvatarPartChoicesProps {
  /** Artwork part whose variants are displayed. */
  readonly part: keyof typeof CRITTERS_V1_PARTS
  /** Complete draft used for previews and immutable replacements. */
  readonly value: CrittersAvatarConfigurationV1
  /** Disables the entire radio group during persistence. */
  readonly disabled: boolean
  /** Receives the full draft with only this part changed. */
  readonly onChange: (value: CrittersAvatarConfigurationV1) => void
}

const OPTION_IMAGE_SIZE = 80

/** Displays image choices and explicit None for nullable components. */
const AvatarPartChoices: FC<AvatarPartChoicesProps> = ({
  part,
  value,
  disabled,
  onChange,
}) => {
  const name = useId()
  const optional = part === 'top' || part === 'pattern' || part === 'cheeks'
  const choices: readonly (string | null)[] = optional
    ? [null, ...CRITTERS_V1_PARTS[part]]
    : CRITTERS_V1_PARTS[part]
  const title = part === 'top' ? 'Head decoration' : avatarChoiceLabel(part)

  return (
    <fieldset className={styles.group} disabled={disabled}>
      <legend>{title}</legend>
      <div className={styles.choices}>
        {choices.map((choice) => {
          const label = choice === null ? 'None' : avatarChoiceLabel(choice)
          const next = { ...value, [part]: choice }
          const selected = value[part] === choice

          return (
            <Surface
              as="label"
              interactive={!disabled}
              className={styles.choice}
              key={choice ?? 'none'}>
              <input
                type="radio"
                name={name}
                value={choice ?? 'none'}
                aria-label={`${title}: ${label}`}
                checked={selected}
                onChange={() => onChange(next)}
              />
              <PlayerAvatar
                avatar={next}
                size={OPTION_IMAGE_SIZE}
                alt=""
                className={styles.optionAvatar}
              />
              <span className={styles.choiceLabel}>{label}</span>
              {selected && (
                <span className={styles.selected} aria-hidden="true">
                  ✓
                </span>
              )}
            </Surface>
          )
        })}
      </div>
    </fieldset>
  )
}

export default AvatarPartChoices
