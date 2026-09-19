import { faRefresh } from '@fortawesome/free-solid-svg-icons'
import {
  generateNickname,
  PLAYER_NICKNAME_MAX_LENGTH,
  PLAYER_NICKNAME_MIN_LENGTH,
  PLAYER_NICKNAME_REGEX,
} from '@klurigo/common'
import type { FC } from 'react'

import Button from '../Button'
import TextField from '../TextField'

import styles from './NicknameTextField.module.scss'

export interface NicknameTextFieldProps {
  value?: string
  placeholder?: string
  disabled?: boolean
  onChange?: (value: string) => void
  onValid?: (valid: boolean) => void
}

const NicknameTextField: FC<NicknameTextFieldProps> = ({
  value,
  placeholder = 'Default Nickname',
  disabled = false,
  onChange,
  onValid,
}) => {
  const handleRefreshNicknameClick = () => {
    onChange?.(generateNickname())
  }

  return (
    <div className={styles.nicknameTextFieldContainer}>
      <TextField
        id="default-nickname-textfield"
        type="text"
        kind="primary"
        placeholder={placeholder}
        value={value}
        minLength={PLAYER_NICKNAME_MIN_LENGTH}
        maxLength={PLAYER_NICKNAME_MAX_LENGTH}
        regex={PLAYER_NICKNAME_REGEX}
        disabled={disabled}
        onChange={(value) => onChange?.(value as string)}
        onValid={(valid) => onValid?.(valid)}
        required
      />
      <Button
        id="shuffle-nickname-button"
        type="button"
        variant="primary"
        surface="brand"
        disabled={disabled}
        icon={faRefresh}
        onClick={handleRefreshNicknameClick}
      />
    </div>
  )
}

export default NicknameTextField
