import type { ChangeEvent, FC } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { classNames } from '../../utils/helpers'
import {
  isCallbackValid,
  isValidNumber,
  isValidString,
} from '../../utils/validation'
import InputError from '../InputError'

import styles from './TextField.module.scss'

export interface TextFieldProps {
  id: string
  name?: string
  type: 'text' | 'number' | 'password'
  surface?: 'brand' | 'light'
  size?: 'normal' | 'small'
  grow?: boolean
  placeholder?: string
  value?: string | number
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  regex?: RegExp | { value: RegExp; message: string }
  required?: boolean | string
  disabled?: boolean
  readOnly?: boolean
  customErrorMessage?: string
  showErrorMessage?: boolean
  forceValidate?: boolean
  autoFocus?: boolean
  onChange?: (value?: string | number) => void
  onValid?: (valid: boolean) => void
  onAdditionalValidation?: (value: string | number) => boolean | string
}

const TextField: FC<TextFieldProps> = ({
  id,
  name,
  type,
  surface = 'brand',
  size = 'normal',
  grow,
  placeholder,
  value,
  min,
  max,
  minLength,
  maxLength,
  regex,
  required,
  disabled,
  readOnly,
  customErrorMessage,
  showErrorMessage = true,
  forceValidate = false,
  autoFocus = false,
  onChange,
  onValid,
  onAdditionalValidation,
}) => {
  const [internalValue, setInternalValue] = useState<string | number>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInternalValue(value ?? '')
  }, [value])

  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled && !readOnly) {
      // Small delay to ensure component is fully mounted
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [autoFocus, disabled, readOnly])

  const [hasFocus, setHasFocus] = useState<boolean>(false)
  const [lostFocus, setLostFocus] = useState<boolean>(false)

  const [valid, errorMessage] = useMemo<[boolean, string | undefined]>(() => {
    if (customErrorMessage?.trim()?.length) {
      return [false, customErrorMessage]
    }

    let tmpValid = true
    let tmpErrorMessage: string | undefined

    if (type === 'text' || type === 'password') {
      ;[tmpValid, tmpErrorMessage] = isValidString({
        value: internalValue as string,
        disabled,
        required,
        minLength,
        maxLength,
        regex,
      })
    }

    if (type === 'number') {
      ;[tmpValid, tmpErrorMessage] = isValidNumber({
        value: internalValue as number,
        disabled,
        required,
        min,
        max,
      })
    }

    if (tmpValid) {
      ;[tmpValid, tmpErrorMessage] = isCallbackValid(
        internalValue,
        onAdditionalValidation,
      )
    }

    return [tmpValid, tmpErrorMessage]
  }, [
    type,
    internalValue,
    disabled,
    required,
    min,
    max,
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

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    let newValue: string | number | undefined = event.target.value
    if (type === 'number') {
      const parsedValue = parseInt(newValue, 10)
      newValue = isNaN(parsedValue) ? undefined : parsedValue
    }
    setInternalValue(newValue)
    onChange?.(newValue)
  }

  return (
    <div
      className={classNames(
        styles.inputContainer,
        grow ? styles.grow : undefined,
      )}>
      <div
        className={classNames(
          styles.textFieldInputContainer,
          surface === 'brand' ? styles.surfaceBrand : undefined,
          surface === 'light' ? styles.surfaceLight : undefined,
          size === 'small' ? styles.sizeSmall : undefined,
          disabled ? styles.disabled : undefined,
          showError ? styles.error : undefined,
        )}>
        <input
          ref={inputRef}
          id={id}
          name={name ?? id}
          type={type}
          value={internalValue ?? ''}
          min={min}
          max={max}
          minLength={minLength}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          className={styles.textfield}
          onChange={handleChange}
          onFocus={() => setHasFocus(true)}
          onBlur={() => {
            setHasFocus(false)
            setLostFocus(true)
          }}
          data-testid={`test-${id}-textfield`}
        />
      </div>
      {showError && showErrorMessage && (
        <InputError message={errorMessage ?? 'Unknown error'} size={size} />
      )}
    </div>
  )
}

export default TextField
