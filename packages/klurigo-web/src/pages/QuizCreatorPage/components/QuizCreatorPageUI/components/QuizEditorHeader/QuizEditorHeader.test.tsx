import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'

import type { QuizSettingsValidationResult } from '../../../../utils/QuizSettingsDataSource'

import QuizEditorHeader from './QuizEditorHeader'

const validation = {
  valid: true,
  errors: [],
} as unknown as QuizSettingsValidationResult

describe('QuizEditorHeader', () => {
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
        onOpenSettings={onOpenSettings}
        onSaveQuiz={onSaveQuiz}
        onExit={onExit}
      />,
    )

    const title = container.querySelector(
      '#quiz-title-textfield',
    ) as HTMLInputElement
    expect(title).toHaveValue('My quiz')
    fireEvent.change(title, { target: { value: 'New title' } })
    expect(onQuizSettingsValueChange).toHaveBeenCalledWith('title', 'New title')

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    expect(onOpenSettings).toHaveBeenCalledOnce()
    expect(onSaveQuiz).toHaveBeenCalledOnce()
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('preserves the save disabled and loading states', () => {
    const props = {
      quizSettings: {},
      quizSettingsValidation: validation,
      onQuizSettingsValueChange: vi.fn(),
      onOpenSettings: vi.fn(),
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
          onOpenSettings={vi.fn()}
          onSaveQuiz={vi.fn()}
          onExit={vi.fn()}
        />,
      )

      expect(
        container.querySelector('#quiz-title-textfield'),
      ).not.toBeInTheDocument()
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
      expect(screen.queryByText('Save')).not.toBeInTheDocument()
      expect(screen.queryByText('Exit')).not.toBeInTheDocument()
      expect(container.querySelector('#settings-button')).toBeInTheDocument()
      expect(container.querySelector('#save-button')).toBeInTheDocument()
      expect(container.querySelector('#exit-button')).toBeInTheDocument()
    } finally {
      width.mockRestore()
    }
  })
})
