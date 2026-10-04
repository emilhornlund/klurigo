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

vi.mock('../../../../../../components', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../../../components')
  >('../../../../../../components')

  return {
    ...actual,
    // Media selection is an infrastructure boundary in this form test. The
    // real media providers have their own focused tests.
    MediaModal: ({
      onChange,
      onClose,
    }: {
      onChange: (value: { type: string; url: string }) => void
      onClose: () => void
    }) => (
      <div role="dialog" aria-label="Add image cover">
        <button
          type="button"
          onClick={() =>
            onChange({ type: MediaType.Image, url: 'https://cdn/new.jpg' })
          }>
          Pick image
        </button>
        <button type="button" onClick={onClose}>
          Close media picker
        </button>
      </div>
    ),
    // Image loading is covered by ResponsiveImage tests; keep this form test
    // deterministic while exercising the real form controls and modal.
    ResponsiveImage: ({ imageURL }: { imageURL?: string }) => (
      <img alt="Quiz cover" src={imageURL} />
    ),
  }
})

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
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
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
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: 'Quiz cover' }),
    ).not.toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Quiz cover' })).toHaveAttribute(
      'src',
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
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
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
    expect(
      screen.queryByRole('dialog', { name: 'Add image cover' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(
      screen.getByRole('dialog', { name: 'Add image cover' }),
    ).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pick image' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(
      screen.getByRole('dialog', { name: 'Add image cover' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close media picker' }))
    expect(
      screen.queryByRole('dialog', { name: 'Add image cover' }),
    ).not.toBeInTheDocument()
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
    fireEvent.change(screen.getByLabelText('Title'), {
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
    fireEvent.change(screen.getByLabelText('Description'), {
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
    fireEvent.change(screen.getByLabelText('Category'), {
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
    fireEvent.change(screen.getByLabelText('Category'), {
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
    fireEvent.change(screen.getByLabelText('Visibility'), {
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
    fireEvent.change(screen.getByLabelText('Language'), {
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
    fireEvent.change(screen.getByLabelText('Language'), {
      target: { value: 'none' },
    })
    expect(onValueChange).toHaveBeenCalledWith('languageCode', undefined)
  })
})
