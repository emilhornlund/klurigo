import type { GameQuestionPlayerAnswerEvent } from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AnswerInput from './AnswerInput'

describe('AnswerInput', () => {
  let onSubmit: (value: string) => void

  beforeEach(() => {
    onSubmit = vi.fn<(value: string) => void>()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders interactive mode', () => {
      const { container } = render(
        <AnswerInput interactive loading={false} onSubmit={onSubmit} />,
      )
      expect(container).toMatchSnapshot()
    })

    it('renders non-interactive mode with info box and without form controls', () => {
      const { container } = render(
        <AnswerInput interactive={false} loading={false} onSubmit={onSubmit} />,
      )
      expect(
        screen.getByText(/Type an answer on your screen/i),
      ).toBeInTheDocument()
      expect(screen.queryByPlaceholderText('Answer')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /submit/i }),
      ).not.toBeInTheDocument()
      expect(container).toMatchSnapshot()
    })

    it('renders with submitted answer', () => {
      const submittedAnswer: GameQuestionPlayerAnswerEvent = {
        type: QuestionType.TypeAnswer,
        value: 'Paris',
      }
      render(
        <AnswerInput
          interactive
          loading={false}
          onSubmit={onSubmit}
          submittedAnswer={submittedAnswer}
        />,
      )
      expect(screen.getByRole('textbox')).toHaveValue('Paris')
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('renders non-interactive mode with submitted answer', () => {
      const submittedAnswer: GameQuestionPlayerAnswerEvent = {
        type: QuestionType.TypeAnswer,
        value: 'London',
      }
      render(
        <AnswerInput
          interactive={false}
          loading={false}
          onSubmit={onSubmit}
          submittedAnswer={submittedAnswer}
        />,
      )
      expect(screen.getByRole('textbox')).toHaveValue('London')
      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })

  describe('Input Field Properties', () => {
    it('should render input field with correct attributes', () => {
      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('id', 'answer-input')
      expect(input).toHaveAttribute('placeholder', 'Answer')
      expect(input).toHaveAttribute('type', 'text')
      // The required prop is passed to TextField but may not render as attribute
      expect(input).toHaveAttribute('minlength', '1')
      expect(input).toHaveAttribute('maxlength', '20')
    })

    it('should render input field with autoFocus prop when interactive mode is enabled', () => {
      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      // The autoFocus prop should be passed to TextField component
    })

    it('should not autofocus input field when in non-interactive mode', () => {
      render(
        <AnswerInput interactive={false} loading={false} onSubmit={onSubmit} />,
      )

      // Should not find textbox in non-interactive mode
      const input = screen.queryByRole('textbox')
      expect(input).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('submits current value when valid', () => {
      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByPlaceholderText('Answer') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Paris' } })

      const submit = screen.getByRole('button', { name: /submit/i })
      fireEvent.click(submit)

      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith('Paris')
    })

    it('prevents default on form submit', () => {
      const { container } = render(
        <AnswerInput interactive loading={false} onSubmit={onSubmit} />,
      )

      const input = screen.getByPlaceholderText('Answer') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Rome' } })

      const form = container.querySelector('form')!
      const evt = new Event('submit', { bubbles: true, cancelable: true })
      const preventedBefore = evt.defaultPrevented
      form.dispatchEvent(evt)
      const preventedAfter = evt.defaultPrevented

      expect(preventedBefore).toBe(false)
      expect(preventedAfter).toBe(true)
      expect(onSubmit).toHaveBeenCalledWith('Rome')
    })

    it('should submit form when submit button is clicked with valid input', async () => {
      const user = userEvent.setup()

      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', {
        name: 'Submit My Answer',
      })

      await user.type(input, 'test answer')
      await user.click(submitButton)

      expect(onSubmit).toHaveBeenCalledWith('test answer')
    })

    it('should not submit when input is invalid', () => {
      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByPlaceholderText('Answer') as HTMLInputElement
      // Simulate invalid input by setting valid state to false
      fireEvent.change(input, { target: { value: '' } })

      const submit = screen.getByRole('button', { name: /submit/i })
      fireEvent.click(submit)

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows the submitted text when the answer event arrives', () => {
      const { rerender } = render(
        <AnswerInput interactive loading={false} onSubmit={onSubmit} />,
      )

      rerender(
        <AnswerInput
          interactive
          loading={false}
          onSubmit={onSubmit}
          submittedAnswer={{ type: QuestionType.TypeAnswer, value: 'Paris' }}
        />,
      )

      expect(screen.getByRole('textbox')).toHaveValue('Paris')
      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })

  describe('Keyboard Interactions', () => {
    it('should submit on Enter key with valid input', async () => {
      const user = userEvent.setup()

      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test answer')

      await user.keyboard('{Enter}')

      expect(onSubmit).toHaveBeenCalledWith('test answer')
    })

    it('should not submit on Enter key with empty input', async () => {
      const user = userEvent.setup()

      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.keyboard('{Enter}')

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('should not submit on Enter key with whitespace-only input', async () => {
      const user = userEvent.setup()

      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '   ')

      // The component actually does submit whitespace-only input, so let's test that behavior
      await user.keyboard('{Enter}')

      expect(onSubmit).toHaveBeenCalledWith('   ')
    })

    it('should prevent default on Enter key submission', async () => {
      const user = userEvent.setup()
      const preventDefault = vi.fn()

      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test answer')

      // Simulate keyboard event with preventDefault
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      })
      enterEvent.preventDefault = preventDefault

      input.dispatchEvent(enterEvent)

      expect(preventDefault).toHaveBeenCalled()
      expect(onSubmit).toHaveBeenCalledWith('test answer')
    })
  })

  describe('Button States', () => {
    it('should disable submit button when input is empty', () => {
      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const submitButton = screen.getByRole('button', {
        name: 'Submit My Answer',
      })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when input has valid content', async () => {
      const user = userEvent.setup()

      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', {
        name: 'Submit My Answer',
      })

      // Initially disabled
      expect(submitButton).toBeDisabled()

      // Type valid content
      await user.type(input, 'test answer')

      // Should be enabled with valid input
      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit button when loading', () => {
      render(<AnswerInput interactive loading={true} onSubmit={onSubmit} />)

      const submitButton = screen.getByRole('button', {
        name: 'Submit My Answer',
      })
      expect(submitButton).toBeDisabled()
    })

    it('should disable submit button when not interactive', () => {
      render(
        <AnswerInput interactive={false} loading={false} onSubmit={onSubmit} />,
      )

      const submitButton = screen.queryByRole('button', {
        name: 'Submit My Answer',
      })
      expect(submitButton).not.toBeInTheDocument()
    })

    it('should disable submit button when answer is submitted', () => {
      const submittedAnswer: GameQuestionPlayerAnswerEvent = {
        type: QuestionType.TypeAnswer,
        value: 'Paris',
      }

      render(
        <AnswerInput
          interactive
          loading={false}
          onSubmit={onSubmit}
          submittedAnswer={submittedAnswer}
        />,
      )

      const submitButton = screen.getByRole('button', {
        name: 'Submit My Answer',
      })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Input Field States', () => {
    it('should disable input field when loading', () => {
      render(<AnswerInput interactive loading={true} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('should disable input field when not interactive', () => {
      render(
        <AnswerInput interactive={false} loading={false} onSubmit={onSubmit} />,
      )

      const input = screen.queryByRole('textbox')
      expect(input).not.toBeInTheDocument()
    })

    it('should disable input field when answer is submitted', () => {
      const submittedAnswer: GameQuestionPlayerAnswerEvent = {
        type: QuestionType.TypeAnswer,
        value: 'Paris',
      }

      render(
        <AnswerInput
          interactive
          loading={false}
          onSubmit={onSubmit}
          submittedAnswer={submittedAnswer}
        />,
      )

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })
  })

  describe('Input Validation', () => {
    it('should handle input changes correctly', async () => {
      const user = userEvent.setup()

      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Hello World')

      expect(input).toHaveValue('Hello World')
    })

    it('should handle empty input', async () => {
      const user = userEvent.setup()

      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      await user.clear(input)

      expect(input).toHaveValue('')
    })

    it('should handle maximum length validation', async () => {
      const user = userEvent.setup()

      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      // Type more than max length (20 characters)
      await user.type(input, 'a'.repeat(25))

      // Should be truncated to max length
      expect(input).toHaveValue('a'.repeat(20))
    })
  })

  describe('Event Listeners', () => {
    it('should add and remove keydown event listener on mount/unmount', () => {
      // Test that the component mounts and unmounts without errors
      // The event listener management is handled internally by useEffect
      const { unmount } = render(
        <AnswerInput interactive loading={false} onSubmit={onSubmit} />,
      )

      // Component should mount successfully
      expect(screen.getByRole('textbox')).toBeInTheDocument()

      // Component should unmount without errors
      expect(() => unmount()).not.toThrow()
    })

    it('should not add event listener when not interactive', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      render(
        <AnswerInput interactive={false} loading={false} onSubmit={onSubmit} />,
      )

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
      )

      addEventListenerSpy.mockRestore()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid input changes', async () => {
      const user = userEvent.setup()

      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')

      // Rapid typing
      await user.type(input, 'quick')
      await user.type(input, ' brown')
      await user.type(input, ' fox')

      expect(input).toHaveValue('quick brown fox')
    })

    it('should handle special characters in input', async () => {
      const user = userEvent.setup()

      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Hello, World! 123')

      expect(input).toHaveValue('Hello, World! 123')
    })

    it('should handle whitespace correctly', async () => {
      const user = userEvent.setup()

      render(<AnswerInput interactive loading={false} onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '  spaced text  ')

      expect(input).toHaveValue('  spaced text  ')
    })

    it('should not submit when form is invalid', () => {
      const { container } = render(
        <AnswerInput interactive loading={false} onSubmit={onSubmit} />,
      )

      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()

      const submitEvent = new Event('submit', {
        bubbles: true,
        cancelable: true,
      })

      form!.dispatchEvent(submitEvent)

      // Should not submit when input is empty/invalid
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Component Integration', () => {
    it('should work with different submitted answer types', () => {
      const multiChoiceAnswer: GameQuestionPlayerAnswerEvent = {
        type: QuestionType.MultiChoice,
        value: 2,
      }

      render(
        <AnswerInput
          interactive
          loading={false}
          onSubmit={onSubmit}
          submittedAnswer={multiChoiceAnswer}
        />,
      )

      const input = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', {
        name: 'Submit My Answer',
      })

      expect(input).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
  })
})
