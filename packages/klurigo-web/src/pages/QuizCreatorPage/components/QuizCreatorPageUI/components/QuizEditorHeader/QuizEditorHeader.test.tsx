import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'

import buttonStyles from '../../../../../../components/Button/Button.module.scss'
import textFieldStyles from '../../../../../../components/TextField/TextField.module.scss'
import type { QuizSettingsValidationResult } from '../../../../utils/QuizSettingsDataSource'

import QuizEditorHeader from './QuizEditorHeader'

const validation = {
  valid: true,
  errors: [],
} as unknown as QuizSettingsValidationResult

describe('QuizEditorHeader', () => {
  it('shows the Untitled quiz placeholder for a new quiz', () => {
    render(
      <QuizEditorHeader
        quizSettings={{}}
        quizSettingsValidation={validation}
        onQuizSettingsValueChange={vi.fn()}
        canSaveQuiz
        showAdvancedQuestionEditor={false}
        onOpenSettings={vi.fn()}
        onToggleAdvancedQuestionEditor={vi.fn()}
        onSaveQuiz={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(screen.getByPlaceholderText('Untitled quiz')).toBeInTheDocument()
  })

  it('renders the title and forwards quiz-level actions', () => {
    const onQuizSettingsValueChange = vi.fn()
    const onOpenSettings = vi.fn()
    const onSaveQuiz = vi.fn()
    const onExit = vi.fn()
    const { container } = render(
      <QuizEditorHeader
        quizSettings={{ title: 'My quiz' }}
        quizSettingsValidation={validation}
        onQuizSettingsValueChange={onQuizSettingsValueChange}
        canSaveQuiz
        showAdvancedQuestionEditor={false}
        onOpenSettings={onOpenSettings}
        onToggleAdvancedQuestionEditor={vi.fn()}
        onSaveQuiz={onSaveQuiz}
        onExit={onExit}
      />,
    )

    const title = container.querySelector(
      '#quiz-title-textfield',
    ) as HTMLInputElement
    expect(title).toHaveValue('My quiz')
    expect(title.parentElement).toHaveClass(textFieldStyles.surfaceBrand)
    expect(title.parentElement).toHaveClass(textFieldStyles.sizeSmall)
    expect(
      container.querySelector('#settings-button')?.parentElement,
    ).toHaveClass(buttonStyles.variantPrimary, buttonStyles.intentDefault)
    expect(container.querySelector('#save-button')?.parentElement).toHaveClass(
      buttonStyles.variantPrimary,
      buttonStyles.intentAccent,
    )
    expect(container.querySelector('#exit-button')?.parentElement).toHaveClass(
      buttonStyles.variantPrimary,
      buttonStyles.surfaceBrand,
    )
    fireEvent.change(title, { target: { value: 'New title' } })
    expect(onQuizSettingsValueChange).toHaveBeenCalledWith('title', 'New title')

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    expect(onOpenSettings).toHaveBeenCalledOnce()
    expect(onSaveQuiz).toHaveBeenCalledOnce()
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('forwards the preview action when preview is available', () => {
    const onPreview = vi.fn()

    render(
      <QuizEditorHeader
        quizSettings={{}}
        quizSettingsValidation={validation}
        onQuizSettingsValueChange={vi.fn()}
        canSaveQuiz
        showAdvancedQuestionEditor={false}
        onOpenSettings={vi.fn()}
        onToggleAdvancedQuestionEditor={vi.fn()}
        onSaveQuiz={vi.fn()}
        onPreview={onPreview}
        canPreview
        onExit={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(onPreview).toHaveBeenCalledOnce()
  })

  it('disables preview when preview is not available', () => {
    render(
      <QuizEditorHeader
        quizSettings={{}}
        quizSettingsValidation={validation}
        onQuizSettingsValueChange={vi.fn()}
        canSaveQuiz
        showAdvancedQuestionEditor={false}
        onOpenSettings={vi.fn()}
        onToggleAdvancedQuestionEditor={vi.fn()}
        onSaveQuiz={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled()
  })

  it('preserves validation on the title field', () => {
    const { container } = render(
      <QuizEditorHeader
        quizSettings={{ title: 'My quiz' }}
        quizSettingsValidation={
          {
            ...validation,
            valid: false,
            errors: [{ path: 'title', message: 'Title is required' }],
          } as QuizSettingsValidationResult
        }
        onQuizSettingsValueChange={vi.fn()}
        canSaveQuiz
        showAdvancedQuestionEditor={false}
        onOpenSettings={vi.fn()}
        onToggleAdvancedQuestionEditor={vi.fn()}
        onSaveQuiz={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(
      container.querySelector('#quiz-title-textfield')?.parentElement,
    ).toHaveClass(textFieldStyles.error)
  })

  it('preserves the save disabled and loading states', () => {
    const props = {
      quizSettings: {},
      quizSettingsValidation: validation,
      onQuizSettingsValueChange: vi.fn(),
      showAdvancedQuestionEditor: false,
      onOpenSettings: vi.fn(),
      onToggleAdvancedQuestionEditor: vi.fn(),
      onSaveQuiz: vi.fn(),
      onExit: vi.fn(),
    }
    const { rerender } = render(
      <QuizEditorHeader {...props} canSaveQuiz={false} />,
    )

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    rerender(<QuizEditorHeader {...props} canSaveQuiz isSavingQuiz />)
    expect(screen.getByTestId('test-save-button-button')).toBeDisabled()
  })

  it('hides the title and button labels on mobile', () => {
    const width = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375)
    try {
      const { container } = render(
        <QuizEditorHeader
          quizSettings={{ title: 'My quiz' }}
          quizSettingsValidation={validation}
          onQuizSettingsValueChange={vi.fn()}
          canSaveQuiz
          showAdvancedQuestionEditor={false}
          onOpenSettings={vi.fn()}
          onToggleAdvancedQuestionEditor={vi.fn()}
          onSaveQuiz={vi.fn()}
          onExit={vi.fn()}
        />,
      )

      expect(
        container.querySelector('#quiz-title-textfield'),
      ).not.toBeInTheDocument()
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
      expect(screen.queryByText('Code')).not.toBeInTheDocument()
      expect(screen.queryByText('Save')).not.toBeInTheDocument()
      expect(screen.queryByText('Exit')).not.toBeInTheDocument()
      expect(container.querySelector('#settings-button')).toBeInTheDocument()
      expect(
        container.querySelector('#toggle-editor-button'),
      ).toBeInTheDocument()
      expect(container.querySelector('#save-button')).toBeInTheDocument()
      expect(container.querySelector('#exit-button')).toBeInTheDocument()
    } finally {
      width.mockRestore()
    }
  })

  it('toggles between the Code and Visual editor labels', () => {
    const onToggleAdvancedQuestionEditor = vi.fn()
    const props = {
      quizSettings: {},
      quizSettingsValidation: validation,
      onQuizSettingsValueChange: vi.fn(),
      canSaveQuiz: true,
      onOpenSettings: vi.fn(),
      onToggleAdvancedQuestionEditor,
      onSaveQuiz: vi.fn(),
      onExit: vi.fn(),
    }
    const { rerender } = render(
      <QuizEditorHeader {...props} showAdvancedQuestionEditor={false} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    expect(onToggleAdvancedQuestionEditor).toHaveBeenCalledOnce()

    rerender(<QuizEditorHeader {...props} showAdvancedQuestionEditor />)
    expect(screen.getByRole('button', { name: 'Visual' })).toBeInTheDocument()
  })
})
