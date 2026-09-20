import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ChangeEvent, FC } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { classNames } from '../../utils/helpers'
import { isCallbackValid, isValidString } from '../../utils/validation'

import styles from './Textarea.module.scss'

export interface TextareaProps {
  id: string
  name?: string
  type?: 'text' | 'code'
  surface?: 'brand' | 'light'
  value?: string
  placeholder?: string
  regex?: RegExp | { value: RegExp; message: string }
  required?: boolean | string
  minLength?: number
  maxLength?: number
  disabled?: boolean
  forceValidate?: boolean
  customErrorMessage?: string
  onChange?: (value: string) => void
  onValid?: (valid: boolean) => void
  onAdditionalValidation?: (value: string) => boolean | string
}

const Textarea: FC<TextareaProps> = ({
  id,
  name = id,
  type = 'text',
  surface = 'brand',
  value,
  placeholder,
  regex,
  required,
  minLength,
  maxLength,
  disabled = false,
  forceValidate = false,
  customErrorMessage,
  onChange,
  onValid,
  onAdditionalValidation,
}) => {
  const [internalValue, setInternalValue] = useState<string>(value ?? '')

  useEffect(() => {
    setInternalValue(value ?? '')
  }, [value])

  const [hasFocus, setHasFocus] = useState<boolean>(false)
  const [lostFocus, setLostFocus] = useState<boolean>(false)

  const [valid, errorMessage] = useMemo<[boolean, string | undefined]>(() => {
    if (customErrorMessage?.trim()?.length) {
      return [false, customErrorMessage]
    }

    let [tmpValid, tmpErrorMessage] = isValidString({
      value: internalValue,
      disabled,
      required,
      minLength,
      maxLength,
      regex,
    })

    if (tmpValid) {
      ;[tmpValid, tmpErrorMessage] = isCallbackValid(
        internalValue,
        onAdditionalValidation,
      )
    }

    return [tmpValid, tmpErrorMessage]
  }, [
    internalValue,
    disabled,
    required,
    minLength,
    maxLength,
    regex,
    onAdditionalValidation,
    customErrorMessage,
  ])

  const prevValid = useRef<boolean | undefined>(undefined)

  const handleValidChange = useCallback(() => {
    if (prevValid.current !== valid) {
      prevValid.current = valid
      onValid?.(valid)
    }
  }, [valid, onValid])

  useEffect(() => {
    handleValidChange()
  }, [handleValidChange])

  const showError = useMemo(
    () =>
      (!valid || customErrorMessage) &&
      (lostFocus || hasFocus || forceValidate),
    [valid, customErrorMessage, lostFocus, hasFocus, forceValidate],
  )

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value
    setInternalValue(newValue)
    onChange?.(newValue)
  }

  return (
    <div className={styles.inputContainer}>
      <div
        className={classNames(
          styles.textareaInputContainer,
          surface === 'brand' ? styles.surfaceBrand : undefined,
          surface === 'light' ? styles.surfaceLight : undefined,
          type === 'code' ? styles.code : undefined,
          disabled ? styles.disabled : undefined,
          showError ? styles.error : undefined,
        )}>
        <textarea
          id={id}
          name={name}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
          onFocus={() => setHasFocus(true)}
          onBlur={() => {
            setHasFocus(false)
            setLostFocus(true)
          }}
          data-testid={`test-${id}-textarea`}
        />
      </div>
      {showError && (
        <div className={styles.errorContainer}>
          <FontAwesomeIcon icon={faTriangleExclamation} />{' '}
          {errorMessage ?? 'Unknown error'}
        </div>
      )}
    </div>
  )
}

export default Textarea
