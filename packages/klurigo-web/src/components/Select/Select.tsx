import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ChangeEvent, FC } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { DeviceType } from '../../utils/device-size.types'
import { classNames } from '../../utils/helpers'
import { useDeviceSizeType } from '../../utils/useDeviceSizeType'
import { isCallbackValid } from '../../utils/validation'
import InputError from '../InputError'

import styles from './Select.module.scss'

export interface SelectProps {
  id: string
  name?: string
  surface?: 'brand' | 'light'
  size?: 'normal' | 'small'
  value?: string | undefined
  values?: { key: string; value: string; valueLabel: string }[]
  required?: boolean | string
  disabled?: boolean
  forceValidate?: boolean
  customErrorMessage?: string
  onChange?: (value: string) => void
  onValid?: (valid: boolean) => void
  onAdditionalValidation?: (value: string) => boolean | string
}

const Select: FC<SelectProps> = ({
  id,
  name = id,
  surface = 'brand',
  size = 'normal',
  value,
  values,
  required,
  disabled = false,
  forceValidate = false,
  customErrorMessage,
  onChange,
  onValid,
  onAdditionalValidation,
}) => {
  const [internalValue, setInternalValue] = useState<string | undefined>(value)

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const [hasFocus, setHasFocus] = useState<boolean>(false)
  const [lostFocus, setLostFocus] = useState<boolean>(false)

  const [valid, errorMessage] = useMemo<[boolean, string | undefined]>(() => {
    if (customErrorMessage?.trim()?.length) {
      return [false, customErrorMessage]
    }

    let tmpValid = true
    let tmpErrorMessage: string | undefined

    if (!disabled) {
      if (required && (!internalValue || !internalValue.length)) {
        tmpValid = false
        tmpErrorMessage =
          typeof required === 'string' ? required : 'This field is required'
      }
    }

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

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value
    setInternalValue(newValue)
    onChange?.(newValue)
  }

  const deviceType = useDeviceSizeType()

  const deviceSize = useMemo(
    () => (deviceType === DeviceType.Mobile ? 'small' : size),
    [size, deviceType],
  )

  return (
    <div className={styles.inputContainer}>
      <div
        className={classNames(
          styles.selectInputContainer,
          surface === 'brand' ? styles.surfaceBrand : undefined,
          surface === 'light' ? styles.surfaceLight : undefined,
          deviceSize === 'small' ? styles.sizeSmall : undefined,
          disabled ? styles.disabled : undefined,
          showError ? styles.error : undefined,
        )}>
        <select
          id={id}
          name={name}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onFocus={() => setHasFocus(true)}
          onBlur={() => {
            setHasFocus(false)
            setLostFocus(true)
          }}
          data-testid={`test-${id}-select`}>
          {values?.map(({ key, value, valueLabel }) => (
            <option key={key} value={value}>
              {valueLabel}
            </option>
          ))}
        </select>
        <FontAwesomeIcon icon={faChevronDown} className={styles.selectIcon} />
      </div>
      {showError && (
        <InputError
          message={errorMessage ?? 'Unknown error'}
          size={deviceSize}
        />
      )}
    </div>
  )
}

export default Select
