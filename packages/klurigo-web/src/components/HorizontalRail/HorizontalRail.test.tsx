import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import HorizontalRail from './HorizontalRail'
import styles from './HorizontalRail.module.scss'

const setRailScrollState = (
  rail: HTMLElement,
  {
    scrollLeft,
    clientWidth,
    scrollWidth,
  }: {
    readonly scrollLeft: number
    readonly clientWidth: number
    readonly scrollWidth: number
  },
): void => {
  Object.defineProperties(rail, {
    scrollLeft: { value: scrollLeft, configurable: true },
    clientWidth: { value: clientWidth, configurable: true },
    scrollWidth: { value: scrollWidth, configurable: true },
  })
}

describe('HorizontalRail', () => {
  it('renders children inside the scroll container', () => {
    render(
      <HorizontalRail>
        <div data-testid="child-1">Card 1</div>
        <div data-testid="child-2">Card 2</div>
      </HorizontalRail>,
    )

    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
  })

  it('renders prev and next arrow buttons', () => {
    render(
      <HorizontalRail>
        <div>Card</div>
      </HorizontalRail>,
    )

    expect(screen.getByRole('button', { name: 'Scroll left' })).toBe(
      screen.getByTestId('rail-arrow-prev'),
    )
    expect(screen.getByRole('button', { name: 'Scroll right' })).toBe(
      screen.getByTestId('rail-arrow-next'),
    )
  })

  it('arrow buttons have correct aria-labels', () => {
    render(
      <HorizontalRail>
        <div>Card</div>
      </HorizontalRail>,
    )

    expect(screen.getByLabelText('Scroll left')).toBeInTheDocument()
    expect(screen.getByLabelText('Scroll right')).toBeInTheDocument()
  })

  it('applies arrowButton and arrowPrev/arrowNext classes to each button', () => {
    render(
      <HorizontalRail>
        <div>Card</div>
      </HorizontalRail>,
    )

    expect(screen.getByRole('button', { name: 'Scroll left' })).toHaveClass(
      styles.arrowButton,
      styles.arrowPrev,
    )
    expect(screen.getByRole('button', { name: 'Scroll right' })).toHaveClass(
      styles.arrowButton,
      styles.arrowNext,
    )
  })

  it('clicking prev arrow calls scrollBy with negative left', async () => {
    const user = userEvent.setup()
    render(
      <HorizontalRail>
        <div>Card</div>
      </HorizontalRail>,
    )

    const rail = screen.getByTestId('horizontal-rail-scroll')
    const scrollBySpy = vi.fn()
    Object.defineProperty(rail, 'scrollBy', { value: scrollBySpy })
    Object.defineProperty(rail, 'clientWidth', {
      value: 800,
      configurable: true,
    })

    await user.click(screen.getByRole('button', { name: 'Scroll left' }))

    expect(scrollBySpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    )
    expect(scrollBySpy.mock.calls[0][0].left).toBeLessThan(0)
  })

  it('clicking next arrow calls scrollBy with positive left', async () => {
    const user = userEvent.setup()
    render(
      <HorizontalRail>
        <div>Card</div>
      </HorizontalRail>,
    )

    const rail = screen.getByTestId('horizontal-rail-scroll')
    const scrollBySpy = vi.fn()
    Object.defineProperty(rail, 'scrollBy', { value: scrollBySpy })
    Object.defineProperty(rail, 'clientWidth', {
      value: 800,
      configurable: true,
    })

    await user.click(screen.getByRole('button', { name: 'Scroll right' }))

    expect(scrollBySpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    )
    expect(scrollBySpy.mock.calls[0][0].left).toBeGreaterThan(0)
  })

  it('adds hasScrollLeft and hasScrollRight classes as the rail scrolls', async () => {
    render(
      <HorizontalRail>
        <div>Card</div>
      </HorizontalRail>,
    )

    const wrapper = screen.getByTestId('horizontal-rail')
    const rail = screen.getByTestId('horizontal-rail-scroll')

    setRailScrollState(rail, {
      scrollLeft: 0,
      clientWidth: 300,
      scrollWidth: 900,
    })
    fireEvent.scroll(rail)

    await waitFor(() => {
      expect(wrapper).not.toHaveClass(styles.hasScrollLeft)
      expect(wrapper).toHaveClass(styles.hasScrollRight)
    })

    setRailScrollState(rail, {
      scrollLeft: 300,
      clientWidth: 300,
      scrollWidth: 900,
    })
    fireEvent.scroll(rail)

    await waitFor(() => {
      expect(wrapper).toHaveClass(styles.hasScrollLeft)
      expect(wrapper).toHaveClass(styles.hasScrollRight)
    })

    setRailScrollState(rail, {
      scrollLeft: 600,
      clientWidth: 300,
      scrollWidth: 900,
    })
    fireEvent.scroll(rail)

    await waitFor(() => {
      expect(wrapper).toHaveClass(styles.hasScrollLeft)
      expect(wrapper).not.toHaveClass(styles.hasScrollRight)
    })
  })

  it('does not have scroll classes when rail does not overflow', () => {
    render(
      <HorizontalRail>
        <div>Card</div>
      </HorizontalRail>,
    )

    const wrapper = screen.getByTestId('horizontal-rail')
    expect(wrapper.className).not.toContain('hasScrollLeft')
    expect(wrapper.className).not.toContain('hasScrollRight')
  })

  it('applies hideScrollbar class when prop is true', () => {
    render(
      <HorizontalRail hideScrollbar>
        <div>Card</div>
      </HorizontalRail>,
    )

    const wrapper = screen.getByTestId('horizontal-rail')
    expect(wrapper).toHaveClass(styles.hideScrollbar)
  })

  it('does not apply hideScrollbar class when prop is false', () => {
    render(
      <HorizontalRail>
        <div>Card</div>
      </HorizontalRail>,
    )

    const wrapper = screen.getByTestId('horizontal-rail')
    expect(wrapper).not.toHaveClass(styles.hideScrollbar)
  })

  it('forwards additional className to the wrapper', () => {
    render(
      <HorizontalRail className="custom-class">
        <div>Card</div>
      </HorizontalRail>,
    )

    expect(screen.getByTestId('horizontal-rail')).toHaveClass('custom-class')
  })
})
