import { QuestionImageRevealEffectType } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ValidationResult } from '../../../../../../../../../../../validation'

import ImageEffectModal, { NONE_KEY } from './ImageEffectModal'

vi.mock('../../../../../../../../../../../components', () => ({
  Modal: ({
    title,
    open,
    closeAction,
    primaryAction,
    children,
  }: {
    title: string
    open: boolean
    closeAction: { label?: string; onClick: () => void }
    primaryAction: { label: string; onClick: () => void }
    children: React.ReactNode
  }) =>
    open ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close" onClick={closeAction.onClick}>
          modal-close
        </button>
        {children}
        <button
          data-testid="test-modal-close-action-button-button"
          onClick={closeAction.onClick}>
          {closeAction.label}
        </button>
        <button
          data-testid="test-modal-primary-action-button-button"
          onClick={primaryAction.onClick}>
          {primaryAction.label}
        </button>
      </div>
    ) : null,

  Select: ({
    id,
    values,
    value,
    customErrorMessage,
    onChange,
  }: {
    id: string
    values: Array<{ key: string; value: string; valueLabel: string }>
    value?: string
    customErrorMessage?: string
    onChange?: (value: string) => void
  }) => (
    <div data-testid={`select-${id}`} data-value={value ?? ''}>
      <div data-testid={`select-${id}-error`}>{customErrorMessage ?? ''}</div>
      <select
        data-testid={`select-${id}-native`}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}>
        {values.map((v) => (
          <option key={v.key} value={v.value}>
            {v.valueLabel}
          </option>
        ))}
      </select>
    </div>
  ),
}))

vi.mock('../../../../../../../../../../../models', () => ({
  ImageRevealEffectLabels: Object.values(QuestionImageRevealEffectType).reduce<
    Record<string, string>
  >((acc, k) => {
    acc[k] = `Label:${k}`
    return acc
  }, {}),
}))

type AnyValidation = ValidationResult<Record<string, unknown>>

function makeValidation(
  errors: Array<{ path: string; message: string }> = [],
): AnyValidation {
  return {
    valid: errors.length === 0,
    errors: errors.map((e) => ({
      path: e.path,
      message: e.message,
      code: 'test',
    })),
  } as unknown as AnyValidation
}

describe('ImageEffectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default title when title is not provided', () => {
    render(
      <ImageEffectModal
        validation={makeValidation()}
        onClose={vi.fn()}
        onChangeImageEffect={vi.fn()}
      />,
    )

    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Add Image Effect',
    )
  })

  it('renders with provided title', () => {
    render(
      <ImageEffectModal
        title="Test Image Effect"
        validation={makeValidation()}
        onClose={vi.fn()}
        onChangeImageEffect={vi.fn()}
      />,
    )

    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Test Image Effect',
    )
  })

  it('initializes Select value from props.value, otherwise NONE_KEY', () => {
    render(
      <ImageEffectModal
        validation={makeValidation()}
        onClose={vi.fn()}
        onChangeImageEffect={vi.fn()}
      />,
    )

    expect(screen.getByTestId('select-select-image-effect-native')).toHaveValue(
      NONE_KEY,
    )

    render(
      <ImageEffectModal
        value={QuestionImageRevealEffectType.Blur}
        validation={makeValidation()}
        onClose={vi.fn()}
        onChangeImageEffect={vi.fn()}
      />,
    )

    const selects = screen.getAllByTestId(
      'select-select-image-effect-native',
    ) as HTMLSelectElement[]

    expect(selects[selects.length - 1]).toHaveValue(
      QuestionImageRevealEffectType.Blur,
    )
  })

  it('shows validation error message for media.effect', () => {
    render(
      <ImageEffectModal
        validation={makeValidation([
          { path: 'media.effect', message: 'Effect error' },
        ])}
        onClose={vi.fn()}
        onChangeImageEffect={vi.fn()}
      />,
    )

    expect(
      screen.getByTestId('select-select-image-effect-error'),
    ).toHaveTextContent('Effect error')
  })

  it('clicking Close button calls onClose and does not call onChangeImageEffect', () => {
    const onClose = vi.fn()
    const onChangeImageEffect = vi.fn()

    render(
      <ImageEffectModal
        validation={makeValidation()}
        onClose={onClose}
        onChangeImageEffect={onChangeImageEffect}
      />,
    )

    fireEvent.click(screen.getByTestId('test-modal-close-action-button-button'))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onChangeImageEffect).not.toHaveBeenCalled()
  })

  it('Apply calls onChangeImageEffect with the currently selected value and then closes', () => {
    const onClose = vi.fn()
    const onChangeImageEffect = vi.fn()

    render(
      <ImageEffectModal
        value={QuestionImageRevealEffectType.Square3x3}
        validation={makeValidation()}
        onClose={onClose}
        onChangeImageEffect={onChangeImageEffect}
      />,
    )

    fireEvent.change(screen.getByTestId('select-select-image-effect-native'), {
      target: { value: QuestionImageRevealEffectType.Blur },
    })

    fireEvent.click(
      screen.getByTestId('test-modal-primary-action-button-button'),
    )

    expect(onChangeImageEffect).toHaveBeenCalledTimes(1)
    expect(onChangeImageEffect).toHaveBeenCalledWith(
      QuestionImageRevealEffectType.Blur,
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('selecting NONE_KEY and applying sends undefined', () => {
    const onClose = vi.fn()
    const onChangeImageEffect = vi.fn()

    render(
      <ImageEffectModal
        value={QuestionImageRevealEffectType.Blur}
        validation={makeValidation()}
        onClose={onClose}
        onChangeImageEffect={onChangeImageEffect}
      />,
    )

    fireEvent.change(screen.getByTestId('select-select-image-effect-native'), {
      target: { value: NONE_KEY },
    })

    fireEvent.click(
      screen.getByTestId('test-modal-primary-action-button-button'),
    )

    expect(onChangeImageEffect).toHaveBeenCalledWith(undefined)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Modal close control calls onClose', () => {
    const onClose = vi.fn()

    render(
      <ImageEffectModal
        validation={makeValidation()}
        onClose={onClose}
        onChangeImageEffect={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('modal-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
