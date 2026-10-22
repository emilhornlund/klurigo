import type { CountdownEvent } from '@klurigo/common'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ProgressBar from './ProgressBar'

describe('ProgressBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const flushEffects = async () => {
    await act(async () => {
      // flush React effects without advancing timers
    })
  }

  it('should render a ProgressBar with initial progress', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:31.000Z',
    }

    const { container } = render(<ProgressBar countdown={countdown} />)

    await flushEffects()

    expect(container).toMatchSnapshot()
  })

  it('should render without styling when disableStyling is true', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:30.000Z',
    }

    const { container } = render(
      <ProgressBar countdown={countdown} disableStyling={true} />,
    )

    await flushEffects()

    const track = container.querySelector('.track') as HTMLElement
    expect(track).not.toHaveClass(
      'safe',
      'caution',
      'urgent',
      'critical',
      'pulse',
    )
  })

  it('should render with 0 progress when countdown has expired', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:02:00.000Z',
    }

    const { container } = render(<ProgressBar countdown={countdown} />)

    await flushEffects()

    expect(container).toMatchSnapshot()
  })

  it('should render with full progress when countdown just started', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:00.000Z',
    }

    const { container } = render(<ProgressBar countdown={countdown} />)

    await flushEffects()

    expect(container).toMatchSnapshot()
  })

  it('should render with 0 progress when dates are invalid', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: 'invalid-date',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:00.000Z',
    }

    const { container } = render(<ProgressBar countdown={countdown} />)

    await flushEffects()

    expect(container).toMatchSnapshot()
  })

  it('should not render with pulse class when progress is greater than 0.1', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:20.000Z',
    }

    const { container } = render(<ProgressBar countdown={countdown} />)

    await flushEffects()

    const progressBar = container.querySelector('.track') as HTMLElement
    expect(progressBar).toHaveClass('safe')
    expect(progressBar).not.toHaveClass('pulse')
    expect(container).toMatchSnapshot()
  })

  it('should handle countdown prop changes', async () => {
    const initialCountdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:30.000Z',
    }

    const { container, rerender } = render(
      <ProgressBar countdown={initialCountdown} />,
    )

    await flushEffects()

    let progressBar = container.querySelector('.track') as HTMLElement
    const initialPct = Number(progressBar.style.width.replace('%', ''))
    expect(initialPct).toBeCloseTo(50, 2)

    const newCountdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:02:00.000Z',
      serverTime: '2023-01-01T00:00:30.000Z',
    }

    rerender(<ProgressBar countdown={newCountdown} />)

    await flushEffects()

    progressBar = container.querySelector('.track') as HTMLElement
    const pct = Number(progressBar.style.width.replace('%', ''))
    expect(pct).toBeCloseTo(75, 2)
  })

  it('should render 0% when duration is zero', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:00:00.000Z',
      serverTime: '2023-01-01T00:00:00.000Z',
    }

    const { container } = render(<ProgressBar countdown={countdown} />)

    await flushEffects()

    const progressBar = container.querySelector('.track') as HTMLElement
    const pct = Number(progressBar.style.width.replace('%', ''))
    expect(pct).toBeCloseTo(0, 2)
  })

  it('should cleanup interval on unmount', () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:00.000Z',
    }

    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    const { unmount } = render(<ProgressBar countdown={countdown} />)

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('should set up interval when valid countdown provided', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:00.000Z',
    }

    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')

    render(<ProgressBar countdown={countdown} />)

    await flushEffects()

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 100)
  })

  it('should clear existing interval when countdown changes', async () => {
    const initialCountdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:00.000Z',
    }

    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    const { rerender } = render(<ProgressBar countdown={initialCountdown} />)

    await flushEffects()

    const newCountdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:01:00.000Z',
      expiryTime: '2023-01-01T00:02:00.000Z',
      serverTime: '2023-01-01T00:01:00.000Z',
    }

    rerender(<ProgressBar countdown={newCountdown} />)

    await flushEffects()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('should render with safe class when progress is 50% or above', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:20.000Z',
    }

    const { container } = render(<ProgressBar countdown={countdown} />)

    await flushEffects()

    const progressBar = container.querySelector('.track') as HTMLElement
    expect(progressBar).toHaveClass('safe')
  })

  it('should render with caution class when progress is between 20-50%', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:40.000Z',
    }

    const { container } = render(<ProgressBar countdown={countdown} />)

    await flushEffects()

    const progressBar = container.querySelector('.track') as HTMLElement
    expect(progressBar).toHaveClass('caution')
  })

  it('should render with urgent class when progress is between 10-20%', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:52.000Z',
    }

    const { container } = render(<ProgressBar countdown={countdown} />)

    await flushEffects()

    const progressBar = container.querySelector('.track') as HTMLElement
    expect(progressBar).toHaveClass('urgent')
  })

  it('should render with critical class when progress is below 10%', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:59.000Z',
    }

    const { container } = render(<ProgressBar countdown={countdown} />)

    await flushEffects()

    const progressBar = container.querySelector('.track') as HTMLElement
    expect(progressBar).toHaveClass('pulse', 'critical')
  })

  it('updates progress over time via interval', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:00.000Z',
    }

    const { container } = render(<ProgressBar countdown={countdown} />)
    await flushEffects()

    const progressBar = container.querySelector('.track') as HTMLElement
    const startPct = Number(progressBar.style.width.replace('%', ''))
    expect(startPct).toBeCloseTo(100, 2)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    const afterPct = Number(progressBar.style.width.replace('%', ''))
    expect(afterPct).toBeLessThan(startPct)
  })

  it('keeps progressing when an event is replayed with identical timestamps', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:00.000Z',
    }

    const { container, rerender } = render(
      <ProgressBar countdown={countdown} />,
    )
    await flushEffects()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    const track = container.querySelector('.track') as HTMLElement
    const beforeReplay = Number(track.style.width.replace('%', ''))

    rerender(<ProgressBar countdown={{ ...countdown }} />)
    await flushEffects()

    const afterReplay = Number(track.style.width.replace('%', ''))
    expect(afterReplay).toBeCloseTo(beforeReplay, 2)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(Number(track.style.width.replace('%', ''))).toBeLessThan(afterReplay)
  })

  it('catches up from a refreshed server timestamp without moving backwards', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:00.000Z',
    }

    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    const { container, rerender } = render(
      <ProgressBar countdown={countdown} />,
    )
    await flushEffects()

    act(() => {
      vi.setSystemTime(new Date('2023-01-01T00:00:10.000Z'))
    })
    rerender(
      <ProgressBar
        countdown={{ ...countdown, serverTime: '2023-01-01T00:00:10.000Z' }}
      />,
    )
    await flushEffects()

    const track = container.querySelector('.track') as HTMLElement
    const caughtUpPct = Number(track.style.width.replace('%', ''))
    expect(caughtUpPct).toBeCloseTo((50 / 60) * 100, 2)
    expect(setIntervalSpy).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(Number(track.style.width.replace('%', ''))).toBeLessThan(caughtUpPct)
  })

  it('resets progress and replaces the interval for a new question', async () => {
    const firstCountdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:01:00.000Z',
      serverTime: '2023-01-01T00:00:30.000Z',
    }
    const { container, rerender } = render(
      <ProgressBar countdown={firstCountdown} />,
    )
    await flushEffects()

    const nextCountdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:30.000Z',
      expiryTime: '2023-01-01T00:01:30.000Z',
      serverTime: '2023-01-01T00:00:30.000Z',
    }
    rerender(<ProgressBar countdown={nextCountdown} />)
    await flushEffects()

    const track = container.querySelector('.track') as HTMLElement
    expect(Number(track.style.width.replace('%', ''))).toBeCloseTo(100, 2)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(Number(track.style.width.replace('%', ''))).toBeLessThan(100)
  })

  it('expires the countdown and clears its interval', async () => {
    const countdown: CountdownEvent = {
      initiatedTime: '2023-01-01T00:00:00.000Z',
      expiryTime: '2023-01-01T00:00:01.000Z',
      serverTime: '2023-01-01T00:00:00.000Z',
    }
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const { container } = render(<ProgressBar countdown={countdown} />)
    await flushEffects()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(container.querySelector('.track')).toHaveStyle({ width: '0.00%' })
    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
