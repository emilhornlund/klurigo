import { GameMode, QuestionType } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import QuestionTypePointsBar from './QuestionTypePointsBar'

describe('QuestionTypePointsBar', () => {
  it.each([
    [QuestionType.MultiChoice, 'Multiple choice'],
    [QuestionType.Range, 'Range'],
    [QuestionType.TrueFalse, 'True or false'],
    [QuestionType.TypeAnswer, 'Type answer'],
    [QuestionType.Pin, 'Pin'],
    [QuestionType.Puzzle, 'Puzzle'],
  ])('uses the renamed question type label %s', (questionType, label) => {
    render(
      <QuestionTypePointsBar
        mode={GameMode.Classic}
        questionType={questionType}
      />,
    )

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('renders null for non-classic mode', () => {
    const { container } = render(
      <QuestionTypePointsBar
        mode={GameMode.ZeroToOneHundred}
        questionType={QuestionType.Range}
        questionPoints={1000}
      />,
    )
    expect(screen.queryByText(/points/i)).toBeNull()
    expect(container).toMatchSnapshot()
  })

  it('renders question type label and zero points', () => {
    const { container } = render(
      <QuestionTypePointsBar
        mode={GameMode.Classic}
        questionType={QuestionType.MultiChoice}
        questionPoints={0}
      />,
    )
    expect(screen.getByText('Multiple choice')).toBeInTheDocument()
    expect(screen.getByText('Zero Points')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('renders standard points for 1000', () => {
    const { container } = render(
      <QuestionTypePointsBar
        mode={GameMode.Classic}
        questionType={QuestionType.TrueFalse}
        questionPoints={1000}
      />,
    )
    expect(screen.getByText('True or false')).toBeInTheDocument()
    expect(screen.getByText('Standard Points')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('renders double points for 2000', () => {
    const { container } = render(
      <QuestionTypePointsBar
        mode={GameMode.Classic}
        questionType={QuestionType.Range}
        questionPoints={2000}
      />,
    )
    expect(screen.getByText('Range')).toBeInTheDocument()
    expect(screen.getByText('Double Points')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('renders only question type label when points are undefined', () => {
    const { container } = render(
      <QuestionTypePointsBar
        mode={GameMode.Classic}
        questionType={QuestionType.TypeAnswer}
      />,
    )
    expect(screen.getByText('Type answer')).toBeInTheDocument()
    expect(screen.queryByText('Zero Points')).toBeNull()
    expect(screen.queryByText('Standard Points')).toBeNull()
    expect(screen.queryByText('Double Points')).toBeNull()
    expect(container).toMatchSnapshot()
  })
})
