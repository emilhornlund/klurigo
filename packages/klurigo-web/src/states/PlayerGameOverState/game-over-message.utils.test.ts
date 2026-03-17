import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  GAME_OVER_MESSAGES,
  getGameOverMessage,
} from './game-over-message.utils'

describe('getGameOverMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a first place message for rank 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(getGameOverMessage(1)).toBe(GAME_OVER_MESSAGES[1][0])
  })

  it('returns a second place message for rank 2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(getGameOverMessage(2)).toBe(GAME_OVER_MESSAGES[2][0])
  })

  it('returns a third place message for rank 3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(getGameOverMessage(3)).toBe(GAME_OVER_MESSAGES[3][0])
  })

  it('returns a top 10 message for rank 4', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(getGameOverMessage(4)).toBe(GAME_OVER_MESSAGES.defaultTop10[0])
  })

  it('returns a top 10 message for rank 10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(getGameOverMessage(10)).toBe(GAME_OVER_MESSAGES.defaultTop10[0])
  })

  it('returns a top 20 message for rank 11', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(getGameOverMessage(11)).toBe(GAME_OVER_MESSAGES.defaultTop20[0])
  })

  it('returns a top 20 message for rank 20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(getGameOverMessage(20)).toBe(GAME_OVER_MESSAGES.defaultTop20[0])
  })

  it('returns a below 20 message for rank 21', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(getGameOverMessage(21)).toBe(GAME_OVER_MESSAGES.defaultBelow20[0])
  })

  it('returns a below 20 message for rank 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(getGameOverMessage(0)).toBe(GAME_OVER_MESSAGES.defaultBelow20[0])
  })

  it('returns a below 20 message for a negative rank', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(getGameOverMessage(-1)).toBe(GAME_OVER_MESSAGES.defaultBelow20[0])
  })

  it('can return the last first place message when random selects the last index', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)

    expect(getGameOverMessage(1)).toBe(
      GAME_OVER_MESSAGES[1][GAME_OVER_MESSAGES[1].length - 1],
    )
  })

  it('always returns one of the messages from the selected bucket', () => {
    expect(GAME_OVER_MESSAGES[1]).toContain(getGameOverMessage(1))
    expect(GAME_OVER_MESSAGES[2]).toContain(getGameOverMessage(2))
    expect(GAME_OVER_MESSAGES[3]).toContain(getGameOverMessage(3))
    expect(GAME_OVER_MESSAGES.defaultTop10).toContain(getGameOverMessage(7))
    expect(GAME_OVER_MESSAGES.defaultTop20).toContain(getGameOverMessage(15))
    expect(GAME_OVER_MESSAGES.defaultBelow20).toContain(getGameOverMessage(42))
  })
})
