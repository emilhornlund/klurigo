import { QUIZ_RATING_STARS_MAX, QUIZ_RATING_STARS_MIN } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import StarRating from './StarRating'

describe('StarRating', () => {
  describe('read-only mode (no onChange)', () => {
    it('renders a container with data-testid="star-row"', () => {
      render(<StarRating value={3} />)
      expect(screen.getByTestId('star-row')).toBeInTheDocument()
    })

    it('renders the correct total number of stars', () => {
      render(<StarRating value={3} />)
      const icons = screen.getByTestId('star-row').querySelectorAll('svg')
      expect(icons).toHaveLength(
        QUIZ_RATING_STARS_MAX - QUIZ_RATING_STARS_MIN + 1,
      )
    })

    it('respects a custom max', () => {
      render(<StarRating value={3} max={10} />)
      const icons = screen.getByTestId('star-row').querySelectorAll('svg')
      expect(icons).toHaveLength(10)
    })

    it('does not render any buttons', () => {
      render(<StarRating value={3} />)
      expect(screen.queryAllByRole('button')).toHaveLength(0)
    })

    it('sets aria-label with value and max', () => {
      render(<StarRating value={4} max={5} />)
      expect(screen.getByLabelText('4 out of 5 stars')).toBeInTheDocument()
    })

    it('handles decimal values in aria-label', () => {
      render(<StarRating value={4.6} max={5} />)
      expect(screen.getByLabelText('4.6 out of 5 stars')).toBeInTheDocument()
    })

    it('shows 0 out of max stars when value is undefined', () => {
      render(<StarRating max={5} />)
      expect(screen.getByLabelText('0 out of 5 stars')).toBeInTheDocument()
    })
  })

  describe('interactive mode (with onChange)', () => {
    it('renders star buttons', () => {
      render(<StarRating value={3} onChange={vi.fn()} />)
      expect(
        screen.getAllByRole('button', { name: /Rate \d star/ }),
      ).toHaveLength(QUIZ_RATING_STARS_MAX - QUIZ_RATING_STARS_MIN + 1)
    })

    it('renders correct aria-labels on each button', () => {
      render(<StarRating onChange={vi.fn()} />)
      expect(
        screen.getByRole('button', { name: 'Rate 1 star' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Rate 2 stars' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Rate 5 stars' }),
      ).toBeInTheDocument()
    })

    it('calls onChange when clicking a star different from the current value', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<StarRating value={2} onChange={onChange} />)

      const buttons = screen.getAllByRole('button', { name: /Rate \d star/ })
      await user.click(buttons[3]) // star 4

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith(4)
    })

    it('does not call onChange when clicking the currently selected star', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<StarRating value={4} onChange={onChange} />)

      const buttons = screen.getAllByRole('button', { name: /Rate \d star/ })
      await user.click(buttons[3]) // star 4 again

      expect(onChange).not.toHaveBeenCalled()
    })

    it('respects custom min and max', () => {
      render(<StarRating value={3} min={1} max={3} onChange={vi.fn()} />)
      expect(
        screen.getAllByRole('button', { name: /Rate \d star/ }),
      ).toHaveLength(3)
    })

    it('disables all buttons when disabled=true', () => {
      render(<StarRating value={3} disabled onChange={vi.fn()} />)
      for (const btn of screen.getAllByRole('button', {
        name: /Rate \d star/,
      })) {
        expect(btn).toBeDisabled()
      }
    })

    it('does not call onChange when buttons are disabled', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<StarRating disabled onChange={onChange} />)

      await user.click(
        screen.getAllByRole('button', { name: /Rate \d star/ })[0],
      )

      expect(onChange).not.toHaveBeenCalled()
    })
  })
})
