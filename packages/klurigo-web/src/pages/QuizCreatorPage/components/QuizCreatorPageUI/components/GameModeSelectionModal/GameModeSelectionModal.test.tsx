import { GameMode } from '@klurigo/common'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import GameModeSelectionModal from './GameModeSelectionModal'

describe('GameModeSelectionModal', () => {
  it('returns the selected game mode', () => {
    const onSelect = vi.fn()
    render(<GameModeSelectionModal onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /classic/i }))
    fireEvent.click(screen.getByRole('button', { name: /0-100/i }))

    expect(onSelect).toHaveBeenNthCalledWith(1, GameMode.Classic)
    expect(onSelect).toHaveBeenNthCalledWith(2, GameMode.ZeroToOneHundred)
  })

  it('allows mode cards to be rendered without a selection callback', () => {
    render(<GameModeSelectionModal />)

    expect(screen.getByRole('button', { name: /classic/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /0-100/i })).toBeEnabled()
  })
})
