import { MediaType, URL_REGEX } from '@klurigo/common'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useCallback, useEffect, useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MediaModal from './MediaModal'

vi.mock('../../models', () => ({
  MediaTypeLabels: {
    Image: 'Image',
    Video: 'Video',
    Audio: 'Audio',
  },
}))

vi.mock('../../utils/helpers', () => ({
  classNames: (...parts: Array<string | undefined | false>) =>
    parts.filter(Boolean).join(' '),
}))

vi.mock('../Modal', () => ({
  default: ({
    title,
    open,
    closeAction,
    primaryAction,
    children,
  }: {
    title: string
    open: boolean
    closeAction?: { label?: string; onClick: () => void }
    primaryAction?: {
      label: string
      disabled?: boolean
      loading?: boolean
      onClick: () => void
    }
    children: React.ReactNode
  }) =>
    open ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close" onClick={closeAction?.onClick}>
          modal-close
        </button>
        {children}
        {(closeAction?.label || primaryAction) && (
          <div data-testid="modal-actions">
            {closeAction?.label && (
              <button
                data-testid="test-modal-close-action-button-button"
                onClick={closeAction.onClick}>
                {closeAction.label}
              </button>
            )}
            {primaryAction && (
              <button
                data-testid="test-modal-primary-action-button-button"
                disabled={primaryAction.disabled || primaryAction.loading}
                onClick={primaryAction.onClick}>
                {primaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    ) : null,
}))

vi.mock('../Select', () => ({
  default: ({
    id,
    value,
    values,
    required,
    customErrorMessage,
    onChange,
    onValid,
  }: {
    id: string
    value?: string
    values: Array<{ key: string; value: string; valueLabel: string }>
    required?: boolean
    customErrorMessage?: string
    onChange?: (value: string) => void
    onValid?: (valid: boolean) => void
  }) => (
    <div data-testid={`select-${id}`}>
      <div data-testid={`select-${id}-required`}>{required ? '1' : '0'}</div>
      <div data-testid={`select-${id}-error`}>{customErrorMessage ?? ''}</div>
      <select
        data-testid={`select-${id}-native`}
        value={value ?? ''}
        onChange={(e) => {
          onChange?.(e.target.value)
          onValid?.(true)
        }}>
        {values.map((v) => (
          <option key={v.key} value={v.value}>
            {v.valueLabel}
          </option>
        ))}
      </select>
    </div>
  ),
}))

vi.mock('../TextField', () => ({
  default: ({
    id,
    value,
    placeholder,
    required,
    regex,
    customErrorMessage,
    onChange,
    onValid,
  }: {
    id: string
    value?: string
    placeholder?: string
    required?: boolean
    regex?: { value: RegExp; message: string }
    customErrorMessage?: string
    onChange?: (value: string) => void
    onValid?: (valid: boolean) => void
  }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const lastValidRef = useRef<boolean | null>(null)

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const computeValid = useCallback(
      (v: string): boolean => {
        const hasValue = v.length > 0

        if (required && !hasValue) return false

        if (regex && hasValue) return regex.value.test(v)

        return true
      },
      [regex, required],
    )

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const emitValidIfChanged = useCallback(
      (v: string) => {
        if (!onValid) return
        const nextValid = computeValid(v)
        if (lastValidRef.current !== nextValid) {
          lastValidRef.current = nextValid
          onValid(nextValid)
        }
      },
      [onValid, computeValid],
    )

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      emitValidIfChanged(value ?? '')
      // IMPORTANT: do NOT depend on `regex` object identity, it changes every render.
    }, [value, required, regex?.value, emitValidIfChanged])

    return (
      <div data-testid={`textfield-${id}`}>
        <div data-testid={`textfield-${id}-required`}>
          {required ? '1' : '0'}
        </div>
        <div data-testid={`textfield-${id}-error`}>
          {customErrorMessage ?? ''}
        </div>
        <div data-testid={`textfield-${id}-has-regex`}>{regex ? '1' : '0'}</div>
        <input
          data-testid={`input-${id}`}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e) => {
            const next = e.target.value
            onChange?.(next)
            emitValidIfChanged(next)
          }}
        />
      </div>
    )
  },
}))

vi.mock('../SegmentedControl', () => ({
  default: ({
    id,
    value,
    values,
    onChange,
  }: {
    id: string
    value: string
    values: Array<{ key: string; value: string; valueLabel: string }>
    onChange: (value: string) => void
  }) => (
    <div data-testid={`segmented-${id}`} data-value={value}>
      {values.map((v) => (
        <button
          key={v.key}
          data-testid={`segmented-${id}-btn-${v.value}`}
          onClick={() => onChange(v.value)}>
          {v.valueLabel}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('./components', () => ({
  PexelsImageProvider: ({ onChange }: { onChange: (url: string) => void }) => (
    <div data-testid="pexels-provider">
      <button
        data-testid="pexels-pick"
        onClick={() => onChange('https://images.pexels.com/photo.jpg')}>
        pick-pexels
      </button>
    </div>
  ),
  UploadImageProvider: ({ onChange }: { onChange: (url: string) => void }) => (
    <div data-testid="upload-provider">
      <button
        data-testid="upload-pick"
        onClick={() => onChange('https://cdn.example.com/upload.jpg')}>
        pick-upload
      </button>
    </div>
  ),
}))

describe('MediaModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders default title and default type (Image) and is invalid until URL is valid', () => {
    const onChange = vi.fn()
    const onValid = vi.fn()
    const onClose = vi.fn()

    render(
      <MediaModal onChange={onChange} onValid={onValid} onClose={onClose} />,
    )

    expect(screen.getByTestId('modal-title')).toHaveTextContent('Add Media')

    // Type select exists when imageOnly=false (default)
    expect(screen.getByTestId('select-media-type-select')).toBeInTheDocument()
    expect(screen.getByTestId('select-media-type-select-native')).toHaveValue(
      MediaType.Image,
    )

    // URL field is required and has regex by default (disableValidation=false)
    expect(
      screen.getByTestId('textfield-media-url-textfield-required'),
    ).toHaveTextContent('1')
    expect(
      screen.getByTestId('textfield-media-url-textfield-has-regex'),
    ).toHaveTextContent('1')

    // Apply disabled because initial internalValid.url is false
    expect(
      screen.getByTestId('test-modal-primary-action-button-button'),
    ).toBeDisabled()
  })

  it('applies (calls onChange, onValid(true), onClose) when URL becomes valid and Apply is clicked', () => {
    const onChange = vi.fn()
    const onValid = vi.fn()
    const onClose = vi.fn()

    render(
      <MediaModal onChange={onChange} onValid={onValid} onClose={onClose} />,
    )

    const urlInput = screen.getByTestId('input-media-url-textfield')
    const good = 'https://example.com/image.jpg'
    expect(URL_REGEX.test(good)).toBe(true)

    fireEvent.change(urlInput, { target: { value: good } })

    const apply = screen.getByTestId('test-modal-primary-action-button-button')
    expect(apply).not.toBeDisabled()

    fireEvent.click(apply)

    expect(onChange).toHaveBeenCalledWith({ type: MediaType.Image, url: good })
    expect(onValid).toHaveBeenCalledWith(true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('close button calls onClose', () => {
    const onChange = vi.fn()
    const onValid = vi.fn()
    const onClose = vi.fn()

    render(
      <MediaModal onChange={onChange} onValid={onValid} onClose={onClose} />,
    )

    fireEvent.click(screen.getByTestId('test-modal-close-action-button-button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('imageOnly hides media type Select', () => {
    const onChange = vi.fn()
    const onClose = vi.fn()

    render(<MediaModal imageOnly onChange={onChange} onClose={onClose} />)

    expect(screen.queryByTestId('select-media-type-select')).toBeNull()
  })

  it('changing type resets internal URL and disables Apply again until a new valid URL is set', async () => {
    const onChange = vi.fn()
    const onValid = vi.fn()
    const onClose = vi.fn()

    render(
      <MediaModal onChange={onChange} onValid={onValid} onClose={onClose} />,
    )

    fireEvent.change(screen.getByTestId('input-media-url-textfield'), {
      target: { value: 'https://example.com/a.jpg' },
    })

    const apply = screen.getByTestId('test-modal-primary-action-button-button')
    expect(apply).not.toBeDisabled()

    fireEvent.change(screen.getByTestId('select-media-type-select-native'), {
      target: { value: MediaType.Video },
    })

    expect(screen.getByTestId('input-media-url-textfield')).toHaveValue('')

    await waitFor(() => {
      expect(
        screen.getByTestId('test-modal-primary-action-button-button'),
      ).toBeDisabled()
    })
  })

  it('renders image provider controls when internalType is Image and switches between providers', () => {
    const onChange = vi.fn()
    const onClose = vi.fn()

    render(<MediaModal onChange={onChange} onClose={onClose} />)

    expect(
      screen.getByTestId('segmented-selected-provider-segmented-control'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('pexels-provider')).toBeInTheDocument()
    expect(screen.queryByTestId('upload-provider')).toBeNull()

    fireEvent.click(
      screen.getByTestId(
        'segmented-selected-provider-segmented-control-btn-upload',
      ),
    )

    expect(screen.getByTestId('upload-provider')).toBeInTheDocument()
  })

  it('picking an image from providers sets URL and enables Apply once URL is valid', async () => {
    const onChange = vi.fn()
    const onValid = vi.fn()
    const onClose = vi.fn()

    render(
      <MediaModal onChange={onChange} onValid={onValid} onClose={onClose} />,
    )

    fireEvent.click(screen.getByTestId('pexels-pick'))

    await waitFor(() => {
      const apply = screen.getByTestId(
        'test-modal-primary-action-button-button',
      )
      expect(apply).not.toBeDisabled()
    })

    fireEvent.click(
      screen.getByTestId('test-modal-primary-action-button-button'),
    )

    const urlInput = screen.getByTestId(
      'input-media-url-textfield',
    ) as HTMLInputElement
    expect(onChange).toHaveBeenCalledWith({
      type: MediaType.Image,
      url: urlInput.value,
    })
    expect(onValid).toHaveBeenCalledWith(true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('passes customErrorMessages to Select and TextField', () => {
    const onChange = vi.fn()
    const onClose = vi.fn()

    render(
      <MediaModal
        onChange={onChange}
        onClose={onClose}
        customErrorMessages={{ type: 'Type error', url: 'URL error' }}
      />,
    )

    expect(
      screen.getByTestId('select-media-type-select-error'),
    ).toHaveTextContent('Type error')
    expect(
      screen.getByTestId('textfield-media-url-textfield-error'),
    ).toHaveTextContent('URL error')
  })
})
