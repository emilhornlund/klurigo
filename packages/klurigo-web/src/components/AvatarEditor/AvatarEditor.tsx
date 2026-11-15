import type {
  CRITTERS_V1_PARTS,
  CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { type FC, useId, useState } from 'react'

import { classNames } from '../../utils/helpers'
import Button from '../Button'
import PlayerAvatar from '../PlayerAvatar'
import Select from '../Select'
import Stack from '../Stack'
import Surface from '../Surface'

import styles from './AvatarEditor.module.scss'
import AvatarColorChoices from './components/AvatarColorChoices'
import AvatarPartChoices from './components/AvatarPartChoices'

/** Controlled avatar metadata and the surface on which choices are presented. */
export interface AvatarEditorProps {
  /** Complete selected design, including colors not currently visible. */
  readonly value: CrittersAvatarConfigurationV1
  /** Prevents editing while persistence is in progress. */
  readonly disabled?: boolean
  /** Brand page styling or compact neutral styling inside a dialog. */
  readonly presentation?: 'page' | 'dialog'
  /** Optional explicit randomization action owned by the parent draft. */
  readonly onRandomize?: () => void
  /** Replaces the draft with a complete configuration after a choice changes. */
  readonly onChange: (value: CrittersAvatarConfigurationV1) => void
}

const categories = ['Body', 'Face', 'Head', 'Pattern', 'Colors'] as const
const partsByCategory: Record<
  string,
  readonly (keyof typeof CRITTERS_V1_PARTS)[]
> = {
  Body: ['body'],
  Face: ['eyes', 'mouth', 'cheeks'],
  Head: ['top'],
  Pattern: ['pattern'],
}
const PREVIEW_IMAGE_SIZE = 192

/** Controlled customization; draft ownership and persistence belong to the parent. */
const AvatarEditor: FC<AvatarEditorProps> = ({
  value,
  disabled = false,
  presentation = 'page',
  onRandomize,
  onChange,
}) => {
  const id = useId()
  const [category, setCategory] = useState('Body')

  return (
    <div
      className={classNames(
        styles.editor,
        presentation === 'dialog' ? styles.dialog : undefined,
      )}>
      <Surface className={styles.preview}>
        <PlayerAvatar
          avatar={value}
          size={PREVIEW_IMAGE_SIZE}
          alt="Your avatar preview"
          className={styles.previewAvatar}
        />
        {onRandomize && (
          <Button
            id="randomize-join-avatar"
            type="button"
            variant="outline"
            surface={presentation === 'dialog' ? 'light' : 'brand'}
            size="small"
            disabled={disabled}
            onClick={onRandomize}>
            Randomize
          </Button>
        )}
      </Surface>
      <Stack className={styles.controls} spacing="compact">
        <label
          htmlFor={`${id}-category`}
          className={classNames(
            styles.categoryLabel,
            presentation === 'dialog' ? styles.hiddenLabel : undefined,
          )}>
          Customize
        </label>
        <Select
          id={`${id}-category`}
          value={category}
          disabled={disabled}
          surface={presentation === 'dialog' ? 'light' : 'brand'}
          values={categories.map((name) => ({
            key: name,
            value: name,
            valueLabel: name,
          }))}
          onChange={setCategory}
        />
        {category === 'Colors' ? (
          <>
            {(['body', 'accent', 'background'] as const).map((color) => (
              <AvatarColorChoices
                key={color}
                color={color}
                value={value}
                disabled={disabled}
                onChange={onChange}
              />
            ))}
          </>
        ) : (
          partsByCategory[category]?.map((part) => (
            <AvatarPartChoices
              key={part}
              part={part}
              value={value}
              disabled={disabled}
              onChange={onChange}
            />
          ))
        )}
      </Stack>
    </div>
  )
}

export default AvatarEditor
