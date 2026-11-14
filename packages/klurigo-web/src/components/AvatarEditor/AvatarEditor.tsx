import {
  CRITTERS_V1_COLORS,
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { type FC, useId, useState } from 'react'

import {
  AVATAR_COLOR_LABELS,
  avatarChoiceLabel,
} from '../../utils/avatar/avatar-editor.utils'
import PlayerAvatar from '../PlayerAvatar'
import Select from '../Select'
import Stack from '../Stack'
import Surface from '../Surface'
import Typography from '../Typography'

import styles from './AvatarEditor.module.scss'

export interface AvatarEditorProps {
  readonly value: CrittersAvatarConfigurationV1
  readonly disabled?: boolean
  readonly onChange: (value: CrittersAvatarConfigurationV1) => void
}

const categories = ['Body', 'Face', 'Head', 'Pattern', 'Colors'] as const
const PREVIEW_IMAGE_SIZE = 192
const OPTION_IMAGE_SIZE = 80
type Part = keyof typeof CRITTERS_V1_PARTS

/** Controlled customization; account persistence and draft ownership belong to its form. */
const AvatarEditor: FC<AvatarEditorProps> = ({
  value,
  disabled = false,
  onChange,
}) => {
  const id = useId()
  const [category, setCategory] = useState('Body')
  const parts: Part[] =
    category === 'Face'
      ? ['eyes', 'mouth', 'cheeks']
      : category === 'Head'
        ? ['top']
        : category === 'Pattern'
          ? ['pattern']
          : ['body']

  return (
    <div className={styles.editor}>
      <Surface className={styles.preview}>
        <PlayerAvatar
          avatar={value}
          size={PREVIEW_IMAGE_SIZE}
          alt="Your avatar preview"
          className={styles.previewAvatar}
        />
        <Typography variant="control" align="center" color="inverse">
          Your quiz sidekick
        </Typography>
      </Surface>
      <Stack className={styles.controls} spacing="compact">
        <label htmlFor={`${id}-category`} className={styles.categoryLabel}>
          Customize
        </label>
        <Select
          id={`${id}-category`}
          value={category}
          disabled={disabled}
          values={categories.map((name) => ({
            key: name,
            value: name,
            valueLabel: name,
          }))}
          onChange={setCategory}
        />
        {category !== 'Colors' ? (
          parts.map((part) => {
            const choices: readonly (string | null)[] =
              part === 'top' || part === 'pattern' || part === 'cheeks'
                ? [null, ...CRITTERS_V1_PARTS[part]]
                : CRITTERS_V1_PARTS[part]
            const title =
              part === 'top' ? 'Head decoration' : avatarChoiceLabel(part)
            return (
              <fieldset key={part} className={styles.group} disabled={disabled}>
                <legend>{title}</legend>
                <div className={styles.choices}>
                  {choices.map((choice) => {
                    const label =
                      choice === null ? 'None' : avatarChoiceLabel(choice)
                    const next = { ...value, [part]: choice }
                    return (
                      <Surface
                        as="label"
                        interactive={!disabled}
                        className={styles.choice}
                        key={choice ?? 'none'}>
                        <input
                          type="radio"
                          name={`${id}-${part}`}
                          value={choice ?? 'none'}
                          aria-label={`${title}: ${label}`}
                          checked={value[part] === choice}
                          onChange={() => onChange(next)}
                        />
                        <PlayerAvatar
                          avatar={next}
                          size={OPTION_IMAGE_SIZE}
                          alt=""
                          className={styles.optionAvatar}
                        />
                        <span className={styles.choiceLabel}>{label}</span>
                        {value[part] === choice && (
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
          })
        ) : (
          <>
            <Typography variant="control" color="inverse" align="left">
              Body and accent colors must be different.
            </Typography>
            {(['body', 'accent', 'background'] as const).map((color) => (
              <fieldset
                key={color}
                className={styles.group}
                disabled={disabled}>
                <legend>{avatarChoiceLabel(color)} color</legend>
                <div className={styles.colors}>
                  {CRITTERS_V1_COLORS[color].map((hex) => {
                    const conflict =
                      color === 'body'
                        ? hex === value.accentColor
                        : color === 'accent' && hex === value.bodyColor
                    const selected = value[`${color}Color`] === hex
                    return (
                      <Surface
                        as="label"
                        interactive={!disabled && !conflict}
                        className={styles.choice}
                        key={hex}>
                        <input
                          type="radio"
                          name={`${id}-${color}-color`}
                          value={hex}
                          aria-label={`${avatarChoiceLabel(color)} color: ${AVATAR_COLOR_LABELS[hex]}${conflict ? ' (matches other color)' : ''}`}
                          disabled={conflict}
                          checked={selected}
                          onChange={() =>
                            onChange({ ...value, [`${color}Color`]: hex })
                          }
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
            ))}
          </>
        )}
      </Stack>
    </div>
  )
}

export default AvatarEditor
