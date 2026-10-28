import { afterEach, describe, expect, it, vi } from 'vitest'

import { getPositionMessage, POSITION_MESSAGES } from './message.utils'

describe('getPositionMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns first-place correct messages by random index', () => {
    const r = vi.spyOn(Math, 'random')
    r.mockReturnValue(0)
    expect(getPositionMessage(1, 'correct')).toBe(
      POSITION_MESSAGES[1].correct[0],
    )
    r.mockReturnValue(0.5)
    expect(getPositionMessage(1, 'correct')).toBe(
      POSITION_MESSAGES[1].correct[1],
    )
    r.mockReturnValue(0.999999)
    expect(getPositionMessage(1, 'correct')).toBe(
      POSITION_MESSAGES[1].correct[2],
    )
  })

  it('returns first-place incorrect messages by random index', () => {
    const r = vi.spyOn(Math, 'random')
    r.mockReturnValue(0)
    expect(getPositionMessage(1, 'incorrect')).toBe(
      POSITION_MESSAGES[1].incorrect[0],
    )
    r.mockReturnValue(0.5)
    expect(getPositionMessage(1, 'incorrect')).toBe(
      POSITION_MESSAGES[1].incorrect[1],
    )
    r.mockReturnValue(0.999999)
    expect(getPositionMessage(1, 'incorrect')).toBe(
      POSITION_MESSAGES[1].incorrect[2],
    )
  })

  it('returns second-place messages', () => {
    const r = vi.spyOn(Math, 'random')
    r.mockReturnValue(0)
    expect(getPositionMessage(2, 'correct')).toBe(
      POSITION_MESSAGES[2].correct[0],
    )
    r.mockReturnValue(0.999999)
    expect(getPositionMessage(2, 'incorrect')).toBe(
      POSITION_MESSAGES[2].incorrect[2],
    )
  })

  it('returns third-place messages', () => {
    const r = vi.spyOn(Math, 'random')
    r.mockReturnValue(0)
    expect(getPositionMessage(3, 'correct')).toBe(
      POSITION_MESSAGES[3].correct[0],
    )
    r.mockReturnValue(0.999999)
    expect(getPositionMessage(3, 'incorrect')).toBe(
      POSITION_MESSAGES[3].incorrect[2],
    )
  })

  it('returns top-10 messages for positions 4..10', () => {
    const r = vi.spyOn(Math, 'random')
    r.mockReturnValue(0)
    expect(getPositionMessage(4, 'correct')).toBe(
      POSITION_MESSAGES.defaultTop10.correct[0],
    )
    r.mockReturnValue(0.999999)
    expect(getPositionMessage(10, 'incorrect')).toBe(
      POSITION_MESSAGES.defaultTop10.incorrect[2],
    )
  })

  it('returns top-20 messages for positions 11..20', () => {
    const r = vi.spyOn(Math, 'random')
    r.mockReturnValue(0)
    expect(getPositionMessage(11, 'correct')).toBe(
      POSITION_MESSAGES.defaultTop20.correct[0],
    )
    r.mockReturnValue(0.999999)
    expect(getPositionMessage(20, 'incorrect')).toBe(
      POSITION_MESSAGES.defaultTop20.incorrect[2],
    )
  })

  it('returns below-20 messages for positions > 20', () => {
    const r = vi.spyOn(Math, 'random')
    r.mockReturnValue(0)
    expect(getPositionMessage(21, 'correct')).toBe(
      POSITION_MESSAGES.defaultBelow20.correct[0],
    )
    r.mockReturnValue(0.999999)
    expect(getPositionMessage(99, 'incorrect')).toBe(
      POSITION_MESSAGES.defaultBelow20.incorrect[2],
    )
  })

  it('always returns one of the category messages', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.12)
    expect(POSITION_MESSAGES[1].correct).toContain(
      getPositionMessage(1, 'correct'),
    )
    expect(POSITION_MESSAGES[1].incorrect).toContain(
      getPositionMessage(1, 'incorrect'),
    )
    expect(POSITION_MESSAGES[2].correct).toContain(
      getPositionMessage(2, 'correct'),
    )
    expect(POSITION_MESSAGES[3].incorrect).toContain(
      getPositionMessage(3, 'incorrect'),
    )
    expect(POSITION_MESSAGES.defaultTop10.correct).toContain(
      getPositionMessage(7, 'correct'),
    )
    expect(POSITION_MESSAGES.defaultTop20.incorrect).toContain(
      getPositionMessage(13, 'incorrect'),
    )
    expect(POSITION_MESSAGES.defaultBelow20.correct).toContain(
      getPositionMessage(25, 'correct'),
    )
  })

  it('returns partial-correct messages for every position category', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(getPositionMessage(1, 'partially-correct')).toBe(
      POSITION_MESSAGES[1]['partially-correct'][0],
    )
    expect(getPositionMessage(2, 'partially-correct')).toBe(
      POSITION_MESSAGES[2]['partially-correct'][0],
    )
    expect(getPositionMessage(3, 'partially-correct')).toBe(
      POSITION_MESSAGES[3]['partially-correct'][0],
    )
    expect(getPositionMessage(4, 'partially-correct')).toBe(
      POSITION_MESSAGES.defaultTop10['partially-correct'][0],
    )
    expect(getPositionMessage(11, 'partially-correct')).toBe(
      POSITION_MESSAGES.defaultTop20['partially-correct'][0],
    )
    expect(getPositionMessage(21, 'partially-correct')).toBe(
      POSITION_MESSAGES.defaultBelow20['partially-correct'][0],
    )
  })
})
