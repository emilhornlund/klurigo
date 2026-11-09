import { act, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Menu, MenuItem } from './Menu'

vi.mock('./Menu.module.scss', () => ({
  default: {
    menu: 'menu',
    menuItem: 'menuItem',
    menuSeparator: 'menuSeparator',
    content: 'content',
    icon: 'icon',
  },
}))

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => <span data-testid="fa-icon" />,
}))

const makeRect = (rect: Partial<DOMRect> = {}): DOMRect =>
  ({
    x: 0,
    y: 0,
    width: 50,
    height: 20,
    top: 10,
    left: 20,
    right: 70,
    bottom: 30,
    toJSON: () => ({}),
    ...rect,
  }) as DOMRect

const setupAnchor = (rect: Partial<DOMRect> = {}) => {
  const anchor = document.createElement('button')
  anchor.textContent = 'anchor'
  anchor.getBoundingClientRect = vi.fn(() => makeRect(rect))
  document.body.appendChild(anchor)

  const anchorRef = createRef<HTMLElement>()
  anchorRef.current = anchor

  return { anchor, anchorRef }
}

/**
 * Flushes:
 * - requestAnimationFrame callbacks (we mock RAF to a timer)
 * - pending timers
 * - resulting React state updates (wrapped in act)
 */
const flushPositioning = async () => {
  await act(async () => {
    vi.runOnlyPendingTimers()
  })
}

describe('MenuItem', () => {
  beforeEach(() => {
    navigateMock.mockReset()
  })

  it('renders children', () => {
    render(<MenuItem>Item</MenuItem>)
    expect(screen.getByText('Item')).toBeInTheDocument()
  })

  it('renders icon when icon is provided', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<MenuItem icon={{} as any}>Item</MenuItem>)
    expect(screen.getByTestId('fa-icon')).toBeInTheDocument()
  })

  it('navigates when link is provided', () => {
    render(<MenuItem link="/settings">Settings</MenuItem>)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(navigateMock).toHaveBeenCalledWith('/settings')
  })

  it('calls onClick when provided', () => {
    const onClick = vi.fn()
    render(<MenuItem onClick={onClick}>Do</MenuItem>)
    fireEvent.click(screen.getByRole('button', { name: 'Do' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('navigates and calls onClick when both link and onClick are provided', () => {
    const onClick = vi.fn()
    render(
      <MenuItem link="/a" onClick={onClick}>
        Go
      </MenuItem>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(navigateMock).toHaveBeenCalledWith('/a')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled=true and does not navigate or call onClick', () => {
    const onClick = vi.fn()
    render(
      <MenuItem disabled link="/a" onClick={onClick}>
        Disabled
      </MenuItem>,
    )

    const btn = screen.getByRole('button', { name: 'Disabled' })
    expect(btn).toBeDisabled()

    fireEvent.click(btn)

    expect(navigateMock).not.toHaveBeenCalled()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('prevents default on click', () => {
    const onClick = vi.fn()
    render(<MenuItem onClick={onClick}>Click</MenuItem>)

    const btn = screen.getByRole('button', { name: 'Click' })
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    const preventDefault = vi.spyOn(event, 'preventDefault')

    btn.dispatchEvent(event)

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('Menu', () => {
  const originalRaf = globalThis.requestAnimationFrame

  beforeEach(() => {
    vi.useFakeTimers()

    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(performance.now()), 0)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    globalThis.requestAnimationFrame = originalRaf
    document.body.innerHTML = ''
  })

  const getMenuEl = (container: HTMLElement) => {
    const el = container.querySelector('.menu')
    expect(el).not.toBeNull()
    return el as HTMLDivElement
  }

  it('returns null when isOpen=false', () => {
    const { anchorRef } = setupAnchor()

    const { container } = render(
      <Menu anchorRef={anchorRef} isOpen={false} onClose={vi.fn()}>
        <div>Content</div>
      </Menu>,
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders and is hidden until positioned, then becomes visible', async () => {
    const { anchorRef } = setupAnchor()

    const { container } = render(
      <Menu anchorRef={anchorRef} isOpen onClose={vi.fn()}>
        <div>Content</div>
      </Menu>,
    )

    const menu = getMenuEl(container)
    expect(menu.style.visibility).toBe('hidden')

    await flushPositioning()

    expect(menu.style.visibility).toBe('visible')
  })

  it('positions below + align=start with correct top/left/transform', async () => {
    const { anchorRef } = setupAnchor({
      top: 10,
      bottom: 30,
      left: 20,
      right: 70,
    })

    const { container } = render(
      <Menu
        anchorRef={anchorRef}
        isOpen
        onClose={vi.fn()}
        position="below"
        align="start"
        gap={8}>
        <div>Content</div>
      </Menu>,
    )

    await flushPositioning()

    const menu = getMenuEl(container)

    expect(menu.style.position).toBe('fixed')
    expect(menu.style.top).toBe('38px') // bottom 30 + gap 8
    expect(menu.style.left).toBe('20px') // left
    expect(menu.style.transform).toBe('translate(0px)')
    expect(menu.style.visibility).toBe('visible')
  })

  it('positions below + align=end with correct top/left/transform', async () => {
    const { anchorRef } = setupAnchor({
      top: 80,
      bottom: 100,
      left: 200,
      right: 260,
    })

    const { container } = render(
      <Menu anchorRef={anchorRef} isOpen onClose={vi.fn()} align="end" gap={12}>
        <div>Content</div>
      </Menu>,
    )

    await flushPositioning()

    const menu = getMenuEl(container)

    expect(menu.style.top).toBe('112px') // bottom 100 + gap 12
    expect(menu.style.left).toBe('260px') // right
    expect(menu.style.transform).toBe('translate(-100%)')
  })

  it('positions above + align=start with correct top/left/transform', async () => {
    const { anchorRef } = setupAnchor({
      top: 50,
      bottom: 80,
      left: 10,
      right: 40,
    })

    const { container } = render(
      <Menu
        anchorRef={anchorRef}
        isOpen
        onClose={vi.fn()}
        position="above"
        align="start"
        gap={8}>
        <div>Content</div>
      </Menu>,
    )

    await flushPositioning()

    const menu = getMenuEl(container)

    expect(menu.style.top).toBe('42px') // top 50 - gap 8
    expect(menu.style.left).toBe('10px') // left
    expect(menu.style.transform).toBe('translate(0px, -100%)')
  })

  it('positions above + align=end with correct top/left/transform', async () => {
    const { anchorRef } = setupAnchor({
      top: 50,
      bottom: 80,
      left: 10,
      right: 40,
    })

    const { container } = render(
      <Menu
        anchorRef={anchorRef}
        isOpen
        onClose={vi.fn()}
        position="above"
        align="end"
        gap={8}>
        <div>Content</div>
      </Menu>,
    )

    await flushPositioning()

    const menu = getMenuEl(container)

    expect(menu.style.top).toBe('42px') // top 50 - gap 8
    expect(menu.style.left).toBe('40px') // right
    expect(menu.style.transform).toBe('translate(-100%, -100%)')
  })

  it('calls onClose when clicking outside menu and outside anchor', async () => {
    const onClose = vi.fn()
    const { anchorRef } = setupAnchor()

    const { container } = render(
      <Menu anchorRef={anchorRef} isOpen onClose={onClose}>
        <div>Content</div>
      </Menu>,
    )

    await flushPositioning()
    getMenuEl(container)

    fireEvent.mouseDown(document.body)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when clicking inside menu', async () => {
    const onClose = vi.fn()
    const { anchorRef } = setupAnchor()

    const { container } = render(
      <Menu anchorRef={anchorRef} isOpen onClose={onClose}>
        <button>Inside</button>
      </Menu>,
    )

    await flushPositioning()
    getMenuEl(container)

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Inside' }))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not call onClose when clicking the anchor', async () => {
    const onClose = vi.fn()
    const { anchorRef, anchor } = setupAnchor()

    const { container } = render(
      <Menu anchorRef={anchorRef} isOpen onClose={onClose}>
        <div>Content</div>
      </Menu>,
    )

    await flushPositioning()
    getMenuEl(container)

    fireEvent.mouseDown(anchor)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('adds and removes resize/scroll listeners only while open', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { anchorRef } = setupAnchor()

    const { rerender } = render(
      <Menu anchorRef={anchorRef} isOpen={false} onClose={vi.fn()}>
        <div>Content</div>
      </Menu>,
    )

    rerender(
      <Menu anchorRef={anchorRef} isOpen onClose={vi.fn()}>
        <div>Content</div>
      </Menu>,
    )

    await flushPositioning()

    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true)

    rerender(
      <Menu anchorRef={anchorRef} isOpen={false} onClose={vi.fn()}>
        <div>Content</div>
      </Menu>,
    )

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true)
  })

  it('repositions on scroll and resize while open', async () => {
    const { anchorRef } = setupAnchor({
      top: 10,
      bottom: 30,
      left: 20,
      right: 70,
    })

    const { container } = render(
      <Menu
        anchorRef={anchorRef}
        isOpen
        onClose={vi.fn()}
        gap={8}
        align="start">
        <div>Content</div>
      </Menu>,
    )

    await flushPositioning()

    const menu = getMenuEl(container)
    expect(menu.style.top).toBe('38px')
    expect(menu.style.left).toBe('20px')

    const anchorEl = anchorRef.current!
    const rectMock = vi.mocked(anchorEl.getBoundingClientRect)

    rectMock.mockReturnValueOnce(
      makeRect({
        top: 100,
        bottom: 130,
        left: 40,
        right: 90,
      }),
    )

    fireEvent.scroll(window)

    expect(menu.style.top).toBe('138px')
    expect(menu.style.left).toBe('40px')

    rectMock.mockReturnValueOnce(
      makeRect({
        top: 200,
        bottom: 240,
        left: 60,
        right: 120,
      }),
    )

    fireEvent.resize(window)

    expect(menu.style.top).toBe('248px')
    expect(menu.style.left).toBe('60px')
  })
})
