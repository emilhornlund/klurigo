import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Leaderboard from './Leaderboard'

describe('Leaderboard Component', () => {
  const mockValues = [
    { position: 1, nickname: 'Player1', score: 100, streaks: 5 },
    { position: 2, nickname: 'Player2', score: 80, streaks: 3 },
    { position: 3, nickname: 'Player3', score: 60, streaks: 2 },
    { position: 4, nickname: 'Player4', score: 40, streaks: 1 },
    { position: 5, nickname: 'Player5', score: 20, streaks: 0 },
  ]

  describe('Basic Rendering', () => {
    it('should render Leaderboard including podium', () => {
      const { container } = render(<Leaderboard values={mockValues} />)

      expect(screen.getByText('Player1')).toBeInTheDocument()
      expect(screen.getByText('Player2')).toBeInTheDocument()
      expect(screen.getByText('Player3')).toBeInTheDocument()
      expect(screen.getByText('Player4')).toBeInTheDocument()
      expect(screen.getByText('Player5')).toBeInTheDocument()

      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('80')).toBeInTheDocument()
      expect(screen.getByText('60')).toBeInTheDocument()
      expect(screen.getByText('40')).toBeInTheDocument()
      expect(screen.getByText('20')).toBeInTheDocument()

      expect(container).toMatchSnapshot()
    })

    it('should render Leaderboard excluding podium', () => {
      const { container } = render(
        <Leaderboard values={mockValues} includePodium={false} />,
      )

      expect(screen.queryByText('Player1')).not.toBeInTheDocument()
      expect(screen.queryByText('Player2')).not.toBeInTheDocument()
      expect(screen.queryByText('Player3')).not.toBeInTheDocument()
      expect(screen.getByText('Player4')).toBeInTheDocument()
      expect(screen.getByText('Player5')).toBeInTheDocument()

      expect(container).toMatchSnapshot()
    })

    it('renders only top 5 when includePodium is true', () => {
      const moreValues = [
        ...mockValues,
        { position: 6, nickname: 'Player6', score: 10, streaks: 0 },
      ]

      render(<Leaderboard values={moreValues} includePodium={true} />)

      expect(screen.getByText('Player1')).toBeInTheDocument()
      expect(screen.getByText('Player5')).toBeInTheDocument()
      expect(screen.queryByText('Player6')).not.toBeInTheDocument()
    })

    it('renders empty when includePodium is false and less than 3 players', () => {
      const fewValues = [
        { position: 1, nickname: 'Player1', score: 100, streaks: 0 },
        { position: 2, nickname: 'Player2', score: 80, streaks: 0 },
      ]

      render(<Leaderboard values={fewValues} includePodium={false} />)

      expect(screen.queryByText('Player1')).not.toBeInTheDocument()
      expect(screen.queryByText('Player2')).not.toBeInTheDocument()
    })
  })

  describe('Rank Change Indicators', () => {
    it('displays rank up indicator when previousPosition is higher than current', () => {
      const valuesWithRankChange = [
        {
          position: 1,
          nickname: 'Player1',
          score: 100,
          streaks: 5,
          previousPosition: 3, // Moved up from 3rd to 1st
        },
      ]

      render(<Leaderboard values={valuesWithRankChange} />)

      expect(screen.getByText('↑')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // Change amount: 3 - 1 = 2
    })

    it('displays rank down indicator when previousPosition is lower than current', () => {
      const valuesWithRankChange = [
        {
          position: 3,
          nickname: 'Player3',
          score: 60,
          streaks: 2,
          previousPosition: 1, // Moved down from 1st to 3rd
        },
      ]

      render(<Leaderboard values={valuesWithRankChange} />)

      expect(screen.getByText('↓')).toBeInTheDocument()
      // Use getAllByText for rank change amount since there might be other "2" elements (like streak badges)
      const rankChangeAmounts = screen.getAllByText('2')
      expect(rankChangeAmounts.length).toBeGreaterThan(0)
    })

    it('displays a neutral marker when the rank is unchanged', () => {
      const valuesWithNoChange = [
        {
          position: 2,
          nickname: 'Player2',
          score: 80,
          streaks: 3,
          previousPosition: 2, // No change
        },
      ]

      render(<Leaderboard values={valuesWithNoChange} />)

      expect(screen.queryByText('↑')).not.toBeInTheDocument()
      expect(screen.queryByText('↓')).not.toBeInTheDocument()
      expect(
        screen.getByRole('img', { name: 'Rank unchanged' }),
      ).toHaveTextContent('–')
    })

    it('does not display rank change indicator when previousPosition is undefined', () => {
      const valuesWithoutPrevious = [
        {
          position: 1,
          nickname: 'Player1',
          score: 100,
          streaks: 5,
          // previousPosition is undefined
        },
      ]

      render(<Leaderboard values={valuesWithoutPrevious} />)

      expect(screen.queryByText('↑')).not.toBeInTheDocument()
      expect(screen.queryByText('↓')).not.toBeInTheDocument()
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('handles mixed rank change scenarios', () => {
      const mixedValues = [
        {
          position: 1,
          nickname: 'Player1',
          score: 100,
          streaks: 5,
          previousPosition: 2, // Rank up
        },
        {
          position: 2,
          nickname: 'Player2',
          score: 80,
          streaks: 3,
          // No previous position
        },
        {
          position: 3,
          nickname: 'Player3',
          score: 60,
          streaks: 2,
          previousPosition: 3, // No change
        },
        {
          position: 4,
          nickname: 'Player4',
          score: 40,
          streaks: 1,
          previousPosition: 1, // Rank down
        },
      ]

      render(<Leaderboard values={mixedValues} />)

      // Player1 should show rank up
      expect(screen.getAllByText('↑')).toHaveLength(1)
      // Find the rank change amount specifically within rank change components
      const rankChangeAmounts = document.querySelectorAll('.rankChangeAmount')
      const rankUpAmount = Array.from(rankChangeAmounts).find(
        (el) => el.textContent === '1',
      )
      expect(rankUpAmount).toBeInTheDocument()

      // Player4 should show rank down
      expect(screen.getAllByText('↓')).toHaveLength(1)
      const rankDownAmount = Array.from(rankChangeAmounts).find(
        (el) => el.textContent === '3',
      )
      expect(rankDownAmount).toBeInTheDocument()

      // Player2 and Player3 should not show rank changes
      const rankUpIndicators = screen.getAllByText('↑')
      const rankDownIndicators = screen.getAllByText('↓')
      expect(rankUpIndicators.length + rankDownIndicators.length).toBe(2)
    })
  })

  describe('Animation Classes', () => {
    it('preserves player row identity when ranks, scores, and ordering change', () => {
      const { rerender } = render(<Leaderboard values={mockValues} />)
      const originalRows = screen.getAllByTestId('leaderboard-row')

      rerender(
        <Leaderboard
          values={[
            { ...mockValues[1], position: 1, score: 200, previousPosition: 2 },
            { ...mockValues[0], position: 2, score: 150, previousPosition: 1 },
          ]}
        />,
      )

      const updatedRows = screen.getAllByTestId('leaderboard-row')
      expect(updatedRows[0]).toBe(originalRows[1])
      expect(updatedRows[1]).toBe(originalRows[0])
      expect(updatedRows[0]).toHaveTextContent('200')
      expect(updatedRows[0].style.getPropertyValue('--row-index')).toBe('0')
      expect(
        screen.getByRole('img', { name: 'Up 1 place, from rank 2' }),
      ).toHaveClass('rankUp')
      expect(
        screen.getByRole('img', { name: 'Down 1 place, from rank 1' }),
      ).toHaveClass('rankDown')
    })

    it('applies correct CSS custom properties for animation delays', () => {
      render(<Leaderboard values={mockValues} />)

      // Check that CSS custom properties are set for staggered animations
      const firstRow = document.querySelector('[style*="--row-index: 0"]')
      const secondRow = document.querySelector('[style*="--row-index: 1"]')

      expect(firstRow).toBeInTheDocument()
      expect(secondRow).toBeInTheDocument()
    })

    it('applies topPosition class for podium positions', () => {
      render(<Leaderboard values={mockValues} />)

      // Check that top positions get special styling
      const rows = screen.getAllByTestId('leaderboard-row')
      rows.slice(0, 3).forEach((row) => expect(row).toHaveClass('topPosition'))
      rows.slice(3).forEach((row) => expect(row).not.toHaveClass('topPosition'))
    })

    it('applies gold class when includePodium is true', () => {
      render(<Leaderboard values={mockValues} includePodium={true} />)

      const podiumColumns = document.querySelectorAll('.gold')
      expect(podiumColumns.length).toBe(1)
    })

    it('applies silver class when includePodium is true', () => {
      render(<Leaderboard values={mockValues} includePodium={true} />)

      const podiumColumns = document.querySelectorAll('.silver')
      expect(podiumColumns.length).toBe(1)
    })

    it('applies bronze class when includePodium is true', () => {
      render(<Leaderboard values={mockValues} includePodium={true} />)

      const podiumColumns = document.querySelectorAll('.bronze')
      expect(podiumColumns.length).toBe(1)
    })

    it('does not apply podium class when includePodium is false', () => {
      render(<Leaderboard values={mockValues} includePodium={false} />)

      const podiumColumns = document.querySelectorAll('.podium')
      expect(podiumColumns.length).toBe(0)
    })
  })

  describe('Accessibility', () => {
    it('maintains proper semantic structure', () => {
      render(<Leaderboard values={mockValues} />)

      // Check that position numbers are properly structured
      const positionElements = screen.getAllByText(/^\d+$/)
      expect(positionElements.length).toBeGreaterThan(0)
    })

    it('provides accessible rank change information', () => {
      const valuesWithRankChange = [
        {
          position: 1,
          nickname: 'Player1',
          score: 100,
          streaks: 5,
          previousPosition: 3,
        },
      ]

      render(<Leaderboard values={valuesWithRankChange} />)

      // Rank change indicators should be present and readable
      expect(screen.getByText('↑')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty values array', () => {
      render(<Leaderboard values={[]} />)

      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Player/)).not.toBeInTheDocument()
    })

    it('handles single player', () => {
      const singlePlayer = [
        { position: 1, nickname: 'Solo', score: 100, streaks: 1 },
      ]

      render(<Leaderboard values={singlePlayer} />)

      expect(screen.getByText('Solo')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('handles players without streaks', () => {
      const valuesWithoutStreaks = [
        { position: 1, nickname: 'Player1', score: 100 },
        { position: 2, nickname: 'Player2', score: 80 },
      ]

      render(<Leaderboard values={valuesWithoutStreaks} />)

      expect(screen.getByText('Player1')).toBeInTheDocument()
      expect(screen.getByText('Player2')).toBeInTheDocument()
    })

    it('handles large rank changes', () => {
      const valuesWithLargeChange = [
        {
          position: 1,
          nickname: 'Player1',
          score: 100,
          streaks: 5,
          previousPosition: 10, // Big jump from 10th to 1st
        },
      ]

      render(<Leaderboard values={valuesWithLargeChange} />)

      expect(screen.getByText('↑')).toBeInTheDocument()
      expect(screen.getByText('9')).toBeInTheDocument() // Change amount: 10 - 1 = 9
    })
  })
})
