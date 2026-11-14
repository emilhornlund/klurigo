import { DEFAULT_CRITTERS_AVATAR_V1 } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import AvatarEditor from './AvatarEditor'

describe('AvatarEditor', () => {
  it('changes only the selected part and preserves latent metadata', async () => {
    const change = vi.fn()
    render(
      <AvatarEditor value={DEFAULT_CRITTERS_AVATAR_V1} onChange={change} />,
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Body: Block' }))
    expect(change).toHaveBeenCalledWith({
      ...DEFAULT_CRITTERS_AVATAR_V1,
      body: 'block',
    })
    await userEvent.click(
      screen.getByRole('radio', { name: 'Body: Inverted wedge' }),
    )
    expect(change).toHaveBeenLastCalledWith({
      ...DEFAULT_CRITTERS_AVATAR_V1,
      body: 'wedgeInv',
    })
    await userEvent.selectOptions(screen.getByLabelText('Customize'), 'Head')
    await userEvent.click(
      screen.getByRole('radio', { name: 'Head decoration: None' }),
    )
    expect(change).toHaveBeenLastCalledWith({
      ...DEFAULT_CRITTERS_AVATAR_V1,
      top: null,
    })
  })

  it('exposes named color choices and prevents matching body/accent colors', async () => {
    render(
      <AvatarEditor value={DEFAULT_CRITTERS_AVATAR_V1} onChange={vi.fn()} />,
    )
    await userEvent.selectOptions(screen.getByLabelText('Customize'), 'Colors')
    expect(
      screen.getByRole('radio', {
        name: 'Body color: Gold (matches other color)',
      }),
    ).toBeDisabled()
    expect(
      screen.getByRole('radio', {
        name: 'Accent color: Lavender (matches other color)',
      }),
    ).toBeDisabled()
    expect(
      screen.getByRole('radio', { name: 'Body color: Lavender' }),
    ).toBeChecked()
  })

  it('disables choice groups while saving', () => {
    render(
      <AvatarEditor
        value={DEFAULT_CRITTERS_AVATAR_V1}
        disabled
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('radio', { name: 'Body: Block' })).toBeDisabled()
    expect(screen.getByLabelText('Customize')).toBeDisabled()
  })
})
