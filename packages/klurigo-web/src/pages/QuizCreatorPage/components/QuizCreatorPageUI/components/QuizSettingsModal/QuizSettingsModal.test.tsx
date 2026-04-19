import {
  LanguageCode,
  MediaType,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { QuizSettingsValidationResult } from '../../../../utils/QuizSettingsDataSource'

import QuizSettingsModal from './QuizSettingsModal'

vi.mock('../../../../../../components', () => ({
  Button: ({
    id,
    value,
    onClick,
  }: {
    id?: string
    value?: string
    onClick?: () => void
  }) => (
    <button id={id} onClick={onClick}>
      {value ?? id}
    </button>
  ),
  MediaModal: ({
    onChange,
    onClose,
  }: {
    onChange: (v: { type: string; url: string }) => void
    onClose: () => void
  }) => (
    <div data-testid="media-modal">
      <button
        data-testid="media-modal-pick"
        onClick={() =>
          onChange({ type: MediaType.Image, url: 'https://cdn/new.jpg' })
        }>
        pick
      </button>
      <button data-testid="media-modal-close" onClick={onClose}>
        close
      </button>
    </div>
  ),
  Modal: ({
    title,
    open,
    onClose,
    children,
  }: {
    title: string
    open: boolean
    onClose: () => void
    children: React.ReactNode
  }) =>
    open ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close" onClick={onClose}>
          close
        </button>
        {children}
      </div>
    ) : null,
  ResponsiveImage: ({ imageURL }: { imageURL?: string }) => (
    <div data-testid="responsive-image" data-url={imageURL ?? ''} />
  ),
  Typography: ({
    children,
    variant = 'body',
    className,
  }: {
    children?: React.ReactNode
    variant?: string
    className?: string
  }) => {
    const Tag = ['title', 'title2', 'title3', 'title4', 'title5'].includes(
      variant,
    )
      ? 'h2'
      : 'p'

    return (
      <Tag className={[variant, className].filter(Boolean).join(' ')}>
        {children}
      </Tag>
    )
  },
}))

vi.mock('../../../../../../components/Select', () => ({
  default: ({
    id,
    value,
    values,
    onChange,
  }: {
    id: string
    value?: string
    values: Array<{ key: string; value: string; valueLabel: string }>
    onChange?: (v: string) => void
  }) => (
    <select
      data-testid={`select-${id}`}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}>
      {values.map((v) => (
        <option key={v.key} value={v.value}>
          {v.valueLabel}
        </option>
      ))}
    </select>
  ),
}))

vi.mock('../../../../../../components/Textarea', () => ({
  default: ({
    id,
    value,
    onChange,
  }: {
    id: string
    value?: string
    onChange?: (v: string) => void
  }) => (
    <textarea
      data-testid={`textarea-${id}`}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

vi.mock('../../../../../../components/TextField', () => ({
  default: ({
    id,
    value,
    onChange,
  }: {
    id: string
    value?: string
    onChange?: (v: string) => void
  }) => (
    <input
      data-testid={`textfield-${id}`}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

vi.mock('../../../../../../models', () => ({
  LanguageLabels: Object.fromEntries(
    Object.values(LanguageCode).map((c) => [c, c]),
  ),
  QuizCategoryLabels: Object.fromEntries(
    Object.values(QuizCategory).map((c) => [c, c]),
  ),
  QuizVisibilityLabels: Object.fromEntries(
    Object.values(QuizVisibility).map((v) => [v, v]),
  ),
}))

vi.mock('../../../../validation-rules', () => ({
  getValidationErrorMessage: () => undefined,
}))

const makeValidation = (): QuizSettingsValidationResult =>
  ({ valid: true, errors: [] }) as unknown as QuizSettingsValidationResult

const defaultValues = {
  title: 'My Quiz',
  description: 'A description',
  imageCoverURL: undefined,
  category: QuizCategory.Science,
  visibility: QuizVisibility.Public,
  languageCode: LanguageCode.English,
}

describe('QuizSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with title "Settings"', () => {
    render(
      <QuizSettingsModal
        values={defaultValues}
        validation={makeValidation()}
        onValueChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Settings')
  })

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <QuizSettingsModal
        values={defaultValues}
        validation={makeValidation()}
        onValueChange={vi.fn()}
        onClose={onClose}
      />,
    )
    fireEvent.click(document.getElementById('close-button') as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows Add button and no Delete/ResponsiveImage when imageCoverURL is absent', () => {
    render(
      <QuizSettingsModal
        values={{ ...defaultValues, imageCoverURL: undefined }}
        validation={makeValidation()}
        onValueChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(document.getElementById('add-image-cover-button')).toHaveTextContent(
      'Add',
    )
    expect(
      document.getElementById('delete-image-cover-button'),
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('responsive-image')).not.toBeInTheDocument()
  })

  it('shows Replace, Delete buttons and ResponsiveImage when imageCoverURL is present', () => {
    render(
      <QuizSettingsModal
        values={{ ...defaultValues, imageCoverURL: 'https://cdn/cover.jpg' }}
        validation={makeValidation()}
        onValueChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(document.getElementById('add-image-cover-button')).toHaveTextContent(
      'Replace',
    )
    expect(
      document.getElementById('delete-image-cover-button'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('responsive-image')).toHaveAttribute(
      'data-url',
      'https://cdn/cover.jpg',
    )
  })

  it('calls onValueChange with undefined imageCoverURL when Delete is clicked', () => {
    const onValueChange = vi.fn()
    render(
      <QuizSettingsModal
        values={{ ...defaultValues, imageCoverURL: 'https://cdn/cover.jpg' }}
        validation={makeValidation()}
        onValueChange={onValueChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(
      document.getElementById('delete-image-cover-button') as HTMLElement,
    )
    expect(onValueChange).toHaveBeenCalledWith('imageCoverURL', undefined)
  })

  it('opens MediaModal when Add image cover button is clicked', () => {
    render(
      <QuizSettingsModal
        values={defaultValues}
        validation={makeValidation()}
        onValueChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('media-modal')).not.toBeInTheDocument()
    fireEvent.click(
      document.getElementById('add-image-cover-button') as HTMLElement,
    )
    expect(screen.getByTestId('media-modal')).toBeInTheDocument()
  })

  it('calls onValueChange with imageCoverURL when MediaModal image is picked', () => {
    const onValueChange = vi.fn()
    render(
      <QuizSettingsModal
        values={defaultValues}
        validation={makeValidation()}
        onValueChange={onValueChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(
      document.getElementById('add-image-cover-button') as HTMLElement,
    )
    fireEvent.click(screen.getByTestId('media-modal-pick'))
    expect(onValueChange).toHaveBeenCalledWith(
      'imageCoverURL',
      'https://cdn/new.jpg',
    )
  })

  it('closes MediaModal when MediaModal close is triggered', () => {
    render(
      <QuizSettingsModal
        values={defaultValues}
        validation={makeValidation()}
        onValueChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(
      document.getElementById('add-image-cover-button') as HTMLElement,
    )
    expect(screen.getByTestId('media-modal')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('media-modal-close'))
    expect(screen.queryByTestId('media-modal')).not.toBeInTheDocument()
  })

  it('calls onValueChange when title field changes', () => {
    const onValueChange = vi.fn()
    render(
      <QuizSettingsModal
        values={defaultValues}
        validation={makeValidation()}
        onValueChange={onValueChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('textfield-quiz-title-textfield'), {
      target: { value: 'New Title' },
    })
    expect(onValueChange).toHaveBeenCalledWith('title', 'New Title')
  })

  it('calls onValueChange when description field changes', () => {
    const onValueChange = vi.fn()
    render(
      <QuizSettingsModal
        values={defaultValues}
        validation={makeValidation()}
        onValueChange={onValueChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('textarea-quiz-description-textarea'), {
      target: { value: 'New description' },
    })
    expect(onValueChange).toHaveBeenCalledWith('description', 'New description')
  })

  it('calls onValueChange when category is changed', () => {
    const onValueChange = vi.fn()
    render(
      <QuizSettingsModal
        values={defaultValues}
        validation={makeValidation()}
        onValueChange={onValueChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('select-category-select'), {
      target: { value: QuizCategory.History },
    })
    expect(onValueChange).toHaveBeenCalledWith('category', QuizCategory.History)
  })

  it('calls onValueChange with undefined category when "none" is selected', () => {
    const onValueChange = vi.fn()
    render(
      <QuizSettingsModal
        values={defaultValues}
        validation={makeValidation()}
        onValueChange={onValueChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('select-category-select'), {
      target: { value: 'none' },
    })
    expect(onValueChange).toHaveBeenCalledWith('category', undefined)
  })

  it('calls onValueChange when visibility is changed', () => {
    const onValueChange = vi.fn()
    render(
      <QuizSettingsModal
        values={defaultValues}
        validation={makeValidation()}
        onValueChange={onValueChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('select-visibility-select'), {
      target: { value: QuizVisibility.Private },
    })
    expect(onValueChange).toHaveBeenCalledWith(
      'visibility',
      QuizVisibility.Private,
    )
  })

  it('calls onValueChange when language is changed', () => {
    const onValueChange = vi.fn()
    render(
      <QuizSettingsModal
        values={defaultValues}
        validation={makeValidation()}
        onValueChange={onValueChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('select-language-select'), {
      target: { value: LanguageCode.Swedish },
    })
    expect(onValueChange).toHaveBeenCalledWith(
      'languageCode',
      LanguageCode.Swedish,
    )
  })

  it('calls onValueChange with undefined languageCode when "none" is selected', () => {
    const onValueChange = vi.fn()
    render(
      <QuizSettingsModal
        values={defaultValues}
        validation={makeValidation()}
        onValueChange={onValueChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('select-language-select'), {
      target: { value: 'none' },
    })
    expect(onValueChange).toHaveBeenCalledWith('languageCode', undefined)
  })
})
