import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import QuizTableFilter from './QuizTableFilter'

describe('QuizTableFilter', () => {
  it('should render QuizTableFilter', async () => {
    const { container } = render(
      <QuizTableFilter
        filter={{}}
        onChange={() => undefined}
        showVisibilityFilter
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('names the search and filter actions and preserves their behavior', () => {
    const onChange = vi.fn()
    render(<QuizTableFilter filter={{ search: 'science' }} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Search quizzes' }))
    expect(onChange).toHaveBeenCalledWith({ search: 'science' })

    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }))
    expect(screen.getByText('Refine Your Quiz Search')).toBeInTheDocument()
  })
})
