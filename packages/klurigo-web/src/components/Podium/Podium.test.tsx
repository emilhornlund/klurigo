import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Podium from './Podium'
import styles from './Podium.module.scss'

// JSDOM has no AnimationEvent constructor, so React registers the WebKit event.
const finishAnimation = (element: Element) =>
  fireEvent(element, new Event('webkitAnimationEnd', { bubbles: true }))

describe('Podium', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render Podium from a full leaderboard', async () => {
    const { container } = render(
      <Podium
        values={[
          { position: 1, nickname: 'ShadowCyborg', score: 18456 },
          { position: 2, nickname: 'Radar', score: 18398 },
          { position: 3, nickname: 'ShadowWhirlwind', score: 15492 },
          { position: 4, nickname: 'WhiskerFox', score: 14118 },
          { position: 5, nickname: 'JollyNimbus', score: 13463 },
          { position: 6, nickname: 'PuddingPop', score: 12459 },
          { position: 7, nickname: 'MysticPine', score: 11086 },
          { position: 8, nickname: 'FrostyBear', score: 10361 },
          { position: 9, nickname: 'Willo', score: 9360 },
          { position: 10, nickname: 'ScarletFlame', score: 6723 },
        ]}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render Podium from a leaderboard with 3 players', async () => {
    const mockValues = [
      { position: 1, nickname: 'ShadowCyborg', score: 18456 },
      { position: 2, nickname: 'Radar', score: 18398 },
      { position: 3, nickname: 'ShadowWhirlwind', score: 15492 },
    ]

    const { container } = render(<Podium values={mockValues} />)

    expect(screen.getByText('ShadowCyborg')).toBeInTheDocument()
    expect(screen.getByText('Radar')).toBeInTheDocument()
    expect(screen.getByText('ShadowWhirlwind')).toBeInTheDocument()

    expect(screen.getByText('18456')).toBeInTheDocument()
    expect(screen.getByText('18398')).toBeInTheDocument()
    expect(screen.getByText('15492')).toBeInTheDocument()

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })

  it('should render Podium from a leaderboard with 2 players', async () => {
    const { container } = render(
      <Podium
        values={[
          { position: 1, nickname: 'ShadowCyborg', score: 18456 },
          { position: 2, nickname: 'Radar', score: 18398 },
        ]}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render Podium from a leaderboard with 1 player', async () => {
    const { container } = render(
      <Podium
        values={[{ position: 1, nickname: 'ShadowCyborg', score: 18456 }]}
      />,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render disabled stacks when values are empty', () => {
    const { container } = render(<Podium values={[]} />)

    // All stacks should be disabled (no nicknames)
    expect(screen.getByTestId('podium-disabled-overlay-1')).toBeInTheDocument()
    expect(screen.getByTestId('podium-disabled-overlay-2')).toBeInTheDocument()
    expect(screen.getByTestId('podium-disabled-overlay-3')).toBeInTheDocument()

    // Should still show the three position labels
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    // No winner crown without a nickname
    expect(screen.queryByText('👑')).not.toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })

  it('should celebrate only when the winner nickname has finished revealing', () => {
    vi.useFakeTimers()
    render(<Podium values={[{ position: 1, nickname: 'A', score: 1 }]} />)

    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument()
    // Child animations must not trigger the celebration early.
    finishAnimation(screen.getByText('👑'))
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument()
    finishAnimation(screen.getByText('A').closest(`.${styles.nickname}`)!)

    const confetti = screen.getByTestId('confetti')
    expect(confetti).toHaveAttribute('data-trigger', 'true')
    expect(confetti).toHaveAttribute('data-intensity', 'epic')
    act(() => vi.advanceTimersByTime(2800))
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument()
    finishAnimation(screen.getByText('A').closest(`.${styles.nickname}`)!)
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it.each([1, 2, 3])(
    'assigns consecutive reveal beats for %i players',
    (count) => {
      const values = [
        { position: 1, nickname: 'First', score: 100 },
        { position: 2, nickname: 'Second', score: 90 },
        { position: 3, nickname: 'Third', score: 80 },
      ].slice(0, count)
      render(<Podium values={values} />)

      values
        .slice()
        .reverse()
        .forEach(({ nickname }, index) => {
          const column = screen
            .getByText(nickname)
            .closest('[data-testid="podium-column"]')!
          expect(column).toHaveStyle({ '--position-index': String(index) })
          expect(column).toHaveAttribute('data-occupied', 'true')
          if (nickname !== 'First') {
            finishAnimation(
              screen.getByText(nickname).closest(`.${styles.nickname}`)!,
            )
            expect(screen.queryByTestId('confetti')).not.toBeInTheDocument()
          }
        })
      expect(
        screen
          .getAllByTestId('podium-column')
          .filter((column) => column.dataset.occupied === 'false'),
      ).toHaveLength(3 - count)
    },
  )

  it('does not celebrate an empty podium', () => {
    const { container } = render(<Podium values={[]} />)
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument()
    expect(
      container.querySelector(`.${styles.sparkleContainer}`),
    ).not.toBeInTheDocument()
  })

  it('should show crown only for first place', () => {
    render(
      <Podium
        values={[
          { position: 1, nickname: 'First', score: 100 },
          { position: 2, nickname: 'Second', score: 90 },
          { position: 3, nickname: 'Third', score: 80 },
        ]}
      />,
    )

    // Crown is literal emoji in markup
    expect(screen.getByText('👑')).toBeInTheDocument()
    // Ensure only one crown exists
    expect(screen.getAllByText('👑')).toHaveLength(1)
  })

  it('should render a disabled overlay for positions without a nickname', () => {
    const { container } = render(
      <Podium
        values={[
          { position: 1, nickname: 'First', score: 100 },
          // position 2 is missing entirely
          // position 3 is missing entirely
        ]}
      />,
    )

    expect(
      screen.queryByTestId('podium-disabled-overlay-1'),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('podium-disabled-overlay-2')).toBeInTheDocument()
    expect(screen.getByTestId('podium-disabled-overlay-3')).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })
})
