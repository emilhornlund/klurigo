import {
  CRITTERS_V1_COLORS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { type FC, useId } from 'react'

import {
  AVATAR_COLOR_LABELS,
  avatarChoiceLabel,
} from '../../../../utils/avatar/avatar-editor.utils'
import Surface from '../../../Surface'
import styles from '../../AvatarEditor.module.scss'

/** A palette group that prevents conflicting body and accent selections. */
interface AvatarColorChoicesProps {
  /** Palette role whose persisted color is being edited. */
  readonly color: 'body' | 'accent' | 'background'
  /** Complete draft whose other choices must be preserved. */
  readonly value: CrittersAvatarConfigurationV1
  /** Disables all choices during an in-flight save. */
  readonly disabled: boolean
  /** Receives the draft with only this palette role changed. */
  readonly onChange: (value: CrittersAvatarConfigurationV1) => void
}

/** Renders named, keyboard-accessible color options without changing other fields. */
const AvatarColorChoices: FC<AvatarColorChoicesProps> = ({
  color,
  value,
  disabled,
  onChange,
}) => {
  const name = useId()

  return (
    <fieldset className={styles.group} disabled={disabled}>
      <legend>{avatarChoiceLabel(color)} color</legend>
      <div className={styles.colors}>
        {CRITTERS_V1_COLORS[color].map((hex) => {
          const conflict =
            color === 'body'
              ? hex === value.accentColor
              : color === 'accent' && hex === value.bodyColor
          const selected = value[`${color}Color`] === hex
          const label = `${avatarChoiceLabel(color)} color: ${AVATAR_COLOR_LABELS[hex]}`

          return (
            <Surface
              as="label"
              interactive={!disabled && !conflict}
              className={styles.choice}
              key={hex}>
              <input
                type="radio"
                name={name}
                value={hex}
                aria-label={`${label}${conflict ? ' (matches other color)' : ''}`}
                disabled={conflict}
                checked={selected}
                onChange={() => onChange({ ...value, [`${color}Color`]: hex })}
              />
              <span
                className={styles.swatch}
                style={{ backgroundColor: hex }}
              />
              <span className={styles.choiceLabel}>
                {AVATAR_COLOR_LABELS[hex]}
              </span>
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

export default AvatarColorChoices
