import {
  type CrittersAvatarConfigurationV1,
  DEFAULT_CRITTERS_AVATAR_V1,
} from '@klurigo/common'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import UserAvatarForm from './UserAvatarForm'

describe('UserAvatarForm', () => {
  it('can explicitly save the first starter without changing any choices', async () => {
    const save = vi.fn().mockResolvedValue(DEFAULT_CRITTERS_AVATAR_V1)
    render(<UserAvatarForm onSave={save} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save avatar' }))
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(DEFAULT_CRITTERS_AVATAR_V1),
    )
  })

  it('keeps dirty choices on a background update and discards to the latest saved value', async () => {
    const save = vi.fn()
    const view = render(
      <UserAvatarForm value={DEFAULT_CRITTERS_AVATAR_V1} onSave={save} />,
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Body: Block' }))
    const refreshed = { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'blob' as const }
    view.rerender(<UserAvatarForm value={refreshed} onSave={save} />)
    expect(screen.getByRole('radio', { name: 'Body: Block' })).toBeChecked()
    await userEvent.click(
      screen.getByRole('button', { name: 'Discard changes' }),
    )
    expect(screen.getByRole('radio', { name: 'Body: Blob' })).toBeChecked()
    expect(save).not.toHaveBeenCalled()
  })

  it('retains the failed draft and retries the exact same design', async () => {
    const selected = { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'block' }
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(selected)
    render(<UserAvatarForm value={DEFAULT_CRITTERS_AVATAR_V1} onSave={save} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Body: Block' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save avatar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your design is still here',
    )
    expect(screen.getByRole('radio', { name: 'Body: Block' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Save avatar' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
    expect(save.mock.calls[0][0]).toEqual(selected)
    expect(save.mock.calls[1][0]).toEqual(selected)
  })

  it('does not allow duplicate saves or edits while a save is pending', async () => {
    let finish!: (avatar: CrittersAvatarConfigurationV1) => void
    const save = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    render(<UserAvatarForm onSave={save} />)
    await userEvent.dblClick(screen.getByTestId('test-save-avatar-button'))
    expect(save).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('radio', { name: 'Body: Block' })).toBeDisabled()
    finish(DEFAULT_CRITTERS_AVATAR_V1)
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: 'Body: Block' }),
      ).not.toBeDisabled(),
    )
  })

  it('protects unsupported saved designs from accidental replacement', () => {
    render(
      <UserAvatarForm
        value={
          {
            ...DEFAULT_CRITTERS_AVATAR_V1,
            version: 2,
          } as unknown as CrittersAvatarConfigurationV1
        }
        onSave={vi.fn()}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'saved design has been kept',
    )
    expect(
      screen.queryByRole('button', { name: 'Save avatar' }),
    ).not.toBeInTheDocument()
  })
})
