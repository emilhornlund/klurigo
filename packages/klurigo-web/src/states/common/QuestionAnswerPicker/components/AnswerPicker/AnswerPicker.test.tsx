import type { GameQuestionPlayerAnswerEvent } from '@klurigo/common'
import { QuestionType } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import AnswerPicker from './AnswerPicker'

describe('AnswerPicker', () => {
  it('renders with answers in interactive mode', () => {
    const { container } = render(
      <AnswerPicker
        answers={['Alpha', 'Beta', 'Gamma', 'Delta']}
        interactive
        loading={false}
        onClick={vi.fn()}
      />,
    )
    expect(screen.getAllByRole('button')).toHaveLength(4)
    expect(container).toMatchSnapshot()
  })

  it('calls onClick with the selected index', () => {
    const onClick = vi.fn()
    render(
      <AnswerPicker
        answers={['Red', 'Green', 'Blue']}
        interactive
        loading={false}
        onClick={onClick}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Green' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith(1)
  })

  it('sets stable ids on buttons', () => {
    render(
      <AnswerPicker
        answers={['Paris', 'Berlin', 'Rome']}
        interactive
        loading={false}
        onClick={vi.fn()}
      />,
    )

    expect(document.getElementById('0_Paris')).toBeInTheDocument()
    expect(document.getElementById('1_Berlin')).toBeInTheDocument()
    expect(document.getElementById('2_Rome')).toBeInTheDocument()
  })

  it('disables buttons when not interactive and does not fire onClick', () => {
    const onClick = vi.fn()
    render(
      <AnswerPicker
        answers={['One', 'Two']}
        interactive={false}
        loading={false}
        onClick={onClick}
      />,
    )

    const [one, two] = screen.getAllByRole('button')
    expect(one).toBeDisabled()
    expect(two).toBeDisabled()

    fireEvent.click(one)
    fireEvent.click(two)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders nothing inside grid when answers is empty', () => {
    const { container } = render(
      <AnswerPicker
        answers={[]}
        interactive
        loading={false}
        onClick={vi.fn()}
      />,
    )
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(container).toMatchSnapshot()
  })

  describe('Loading state', () => {
    it('disables buttons when loading is true', () => {
      const onClick = vi.fn()
      render(
        <AnswerPicker
          answers={['Option 1', 'Option 2']}
          interactive
          loading={true}
          onClick={onClick}
        />,
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toBeDisabled()
      })

      fireEvent.click(buttons[0])
      expect(onClick).not.toHaveBeenCalled()
    })

    it('enables buttons when loading is false and interactive is true', () => {
      render(
        <AnswerPicker
          answers={['A', 'B']}
          interactive
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled()
      })
    })
  })

  describe('Submitted answer scenarios', () => {
    it('applies selection class to correct MultiChoice answer', () => {
      const submittedAnswer: GameQuestionPlayerAnswerEvent = {
        type: QuestionType.MultiChoice,
        value: 2,
      }

      render(
        <AnswerPicker
          answers={['Red', 'Green', 'Blue', 'Yellow']}
          submittedAnswer={submittedAnswer}
          interactive={false}
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).not.toHaveClass('selection')
      expect(buttons[1]).not.toHaveClass('selection')
      expect(buttons[2]).toHaveClass('selection')
      expect(buttons[3]).not.toHaveClass('selection')
    })

    it('applies unselected class to non-selected MultiChoice answers', () => {
      const submittedAnswer: GameQuestionPlayerAnswerEvent = {
        type: QuestionType.MultiChoice,
        value: 1,
      }

      render(
        <AnswerPicker
          answers={['First', 'Second', 'Third']}
          submittedAnswer={submittedAnswer}
          interactive={false}
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveClass('unselected')
      expect(buttons[1]).toHaveClass('selection')
      expect(buttons[2]).toHaveClass('unselected')
    })

    it('applies selection class to TrueFalse answer when true (index 0)', () => {
      const submittedAnswer: GameQuestionPlayerAnswerEvent = {
        type: QuestionType.TrueFalse,
        value: true,
      }

      render(
        <AnswerPicker
          answers={['True', 'False']}
          submittedAnswer={submittedAnswer}
          interactive={false}
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveClass('selection')
      expect(buttons[1]).toHaveClass('unselected')
    })

    it('applies selection class to TrueFalse answer when false (index 1)', () => {
      const submittedAnswer: GameQuestionPlayerAnswerEvent = {
        type: QuestionType.TrueFalse,
        value: false,
      }

      render(
        <AnswerPicker
          answers={['Yes', 'No']}
          submittedAnswer={submittedAnswer}
          interactive={false}
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveClass('unselected')
      expect(buttons[1]).toHaveClass('selection')
    })

    it('disables all buttons when submittedAnswer is present', () => {
      const submittedAnswer: GameQuestionPlayerAnswerEvent = {
        type: QuestionType.MultiChoice,
        value: 0,
      }

      render(
        <AnswerPicker
          answers={['A', 'B', 'C']}
          submittedAnswer={submittedAnswer}
          interactive={true}
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toBeDisabled()
      })
    })

    it('applies unselected class to all buttons for unsupported question types', () => {
      const submittedAnswer: GameQuestionPlayerAnswerEvent = {
        type: QuestionType.TypeAnswer,
        value: 'some answer',
      }

      render(
        <AnswerPicker
          answers={['Option 1', 'Option 2']}
          submittedAnswer={submittedAnswer}
          interactive={false}
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).not.toHaveClass('selection')
        expect(button).toHaveClass('unselected')
      })
    })
  })

  describe('Button styling and properties', () => {
    it('sets correct CSS custom property for animation delay', () => {
      render(
        <AnswerPicker
          answers={['First', 'Second', 'Third']}
          interactive
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveStyle('--index: 0')
      expect(buttons[1]).toHaveStyle('--index: 1')
      expect(buttons[2]).toHaveStyle('--index: 2')
    })

    it('renders button with correct structure and content', () => {
      render(
        <AnswerPicker
          answers={['Test Answer']}
          interactive
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const button = screen.getByRole('button', { name: 'Test Answer' })
      expect(button).toBeInTheDocument()

      // Check that button contains a div element and the text
      expect(button.querySelector('div')).toBeInTheDocument()
      expect(button).toHaveTextContent('Test Answer')
    })

    it('handles answers with special characters', () => {
      render(
        <AnswerPicker
          answers={[
            'Answer & More',
            'Answer "quoted"',
            'Answer with émojis 🎉',
          ]}
          interactive
          loading={false}
          onClick={vi.fn()}
        />,
      )

      expect(
        screen.getByRole('button', { name: 'Answer & More' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Answer "quoted"' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Answer with émojis 🎉' }),
      ).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('handles single answer correctly', () => {
      const onClick = vi.fn()
      render(
        <AnswerPicker
          answers={['Only Option']}
          interactive
          loading={false}
          onClick={onClick}
        />,
      )

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()

      fireEvent.click(button)
      expect(onClick).toHaveBeenCalledWith(0)
    })

    it('handles many answers (more than 4)', () => {
      const answers = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
      render(
        <AnswerPicker
          answers={answers}
          interactive
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(7)
      expect(buttons[0].closest('[class*=manyAnswers]')).toBeInTheDocument()

      answers.forEach((answer, index) => {
        expect(buttons[index]).toHaveTextContent(answer)
        expect(buttons[index]).toHaveAttribute('id', `${index}_${answer}`)
      })
    })

    it('handles answers with duplicate values', () => {
      render(
        <AnswerPicker
          answers={['Same', 'Same', 'Different']}
          interactive
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
      expect(buttons[0]).toHaveAttribute('id', '0_Same')
      expect(buttons[1]).toHaveAttribute('id', '1_Same')
      expect(buttons[2]).toHaveAttribute('id', '2_Different')
    })

    it('handles empty string answers', () => {
      render(
        <AnswerPicker
          answers={['', 'Non-empty']}
          interactive
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0]).toHaveTextContent('')
      expect(buttons[1]).toHaveTextContent('Non-empty')
    })
  })

  describe('Interaction scenarios', () => {
    it('does not call onClick when interactive is false even if not loading', () => {
      const onClick = vi.fn()
      render(
        <AnswerPicker
          answers={['Should not click']}
          interactive={false}
          loading={false}
          onClick={onClick}
        />,
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('calls onClick with correct index for multiple clicks', () => {
      const onClick = vi.fn()
      render(
        <AnswerPicker
          answers={['First', 'Second', 'Third']}
          interactive
          loading={false}
          onClick={onClick}
        />,
      )

      const buttons = screen.getAllByRole('button')

      fireEvent.click(buttons[2])
      expect(onClick).toHaveBeenLastCalledWith(2)

      fireEvent.click(buttons[0])
      expect(onClick).toHaveBeenLastCalledWith(0)

      fireEvent.click(buttons[1])
      expect(onClick).toHaveBeenLastCalledWith(1)

      expect(onClick).toHaveBeenCalledTimes(3)
    })

    it('handles rapid successive clicks correctly', () => {
      const onClick = vi.fn()
      render(
        <AnswerPicker
          answers={['Option']}
          interactive
          loading={false}
          onClick={onClick}
        />,
      )

      const button = screen.getByRole('button')

      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)

      expect(onClick).toHaveBeenCalledTimes(3)
      expect(onClick).toHaveBeenLastCalledWith(0)
    })
  })

  describe('Component structure', () => {
    it('renders with correct CSS classes', () => {
      const { container } = render(
        <AnswerPicker
          answers={['Test']}
          interactive
          loading={false}
          onClick={vi.fn()}
        />,
      )

      expect(container.querySelector('.answerPicker')).toBeInTheDocument()
      expect(container.querySelector('.grid')).toBeInTheDocument()
      expect(container.querySelector('.answerButton')).toBeInTheDocument()
    })

    it('maintains button order as provided in answers array', () => {
      const answers = ['Zebra', 'Apple', 'Banana']
      render(
        <AnswerPicker
          answers={answers}
          interactive
          loading={false}
          onClick={vi.fn()}
        />,
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveTextContent('Zebra')
      expect(buttons[1]).toHaveTextContent('Apple')
      expect(buttons[2]).toHaveTextContent('Banana')
    })
  })
})
