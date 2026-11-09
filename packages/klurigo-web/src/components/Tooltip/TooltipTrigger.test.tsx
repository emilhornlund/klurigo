import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import TooltipTrigger from './TooltipTrigger'

vi.mock('./use-tooltip.context', () => {
  return {
    useTooltipContext: vi.fn(),
  }
})

const mockUseTooltipContext = async () =>
  (await import('./use-tooltip.context'))
    .useTooltipContext as unknown as ReturnType<typeof vi.fn>

describe('TooltipTrigger', () => {
  it('should render a button trigger by default with data-state and reset styles', async () => {
    const useTooltipContext = await mockUseTooltipContext()

    const getReferenceProps = vi.fn(<T extends object>(p: T) => p)

    useTooltipContext.mockReturnValue({
      open: false,
      refs: {
        setReference: vi.fn(),
      },
      getReferenceProps,
    })

    render(
      <TooltipTrigger aria-label="trigger">
        <span>Child</span>
      </TooltipTrigger>,
    )

    const button = screen.getByRole('button', { name: 'trigger' })

    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('data-state', 'closed')

    // Check reset properties because CSS serialization can expand `all: unset`.
    expect(button.style).toMatchObject({
      appearance: 'unset',
      background: 'unset',
      border: 'unset',
      padding: 'unset',
    })

    expect(button).toHaveStyle({ cursor: 'pointer' })

    expect(getReferenceProps).toHaveBeenCalledTimes(1)
    expect(getReferenceProps).toHaveBeenCalledWith(
      expect.objectContaining({
        'aria-label': 'trigger',
      }),
    )
  })

  it('should set data-state="open" when context is open', async () => {
    const useTooltipContext = await mockUseTooltipContext()

    useTooltipContext.mockReturnValue({
      open: true,
      refs: {
        setReference: vi.fn(),
      },
      getReferenceProps: <T extends object>(p: T) => p,
    })

    render(<TooltipTrigger>Child</TooltipTrigger>)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-state', 'open')
  })

  it('should clone the child element when asChild is true and merge props', async () => {
    const useTooltipContext = await mockUseTooltipContext()

    const getReferenceProps = vi.fn(<T extends object>(p: T) => ({
      ...p,
      'data-from-floating': 'yes',
    }))

    useTooltipContext.mockReturnValue({
      open: true,
      refs: {
        setReference: vi.fn(),
      },
      getReferenceProps,
    })

    render(
      <TooltipTrigger asChild id="trigger-id" aria-label="x">
        <span data-testid="child" className="child-class">
          Hello
        </span>
      </TooltipTrigger>,
    )

    const child = screen.getByTestId('child')

    expect(child.tagName.toLowerCase()).toBe('span')
    expect(child).toHaveAttribute('data-state', 'open')
    expect(child).toHaveAttribute('data-from-floating', 'yes')

    expect(child).toHaveAttribute('id', 'trigger-id')
    expect(child).toHaveAttribute('aria-label', 'x')
    expect(child).toHaveClass('child-class')

    expect(getReferenceProps).toHaveBeenCalledTimes(1)
  })

  it('should support forwarded refs on default button branch', async () => {
    const useTooltipContext = await mockUseTooltipContext()

    useTooltipContext.mockReturnValue({
      open: false,
      refs: {
        setReference: vi.fn(),
      },
      getReferenceProps: <T extends object>(p: T) => p,
    })

    const ref = createRef<HTMLElement>()

    render(<TooltipTrigger ref={ref}>Child</TooltipTrigger>)

    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName.toLowerCase()).toBe('button')
  })
})
