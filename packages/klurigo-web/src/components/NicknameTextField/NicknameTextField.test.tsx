import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import NicknameTextField from './NicknameTextField'

describe('NicknameTextField', () => {
  test('should render NicknameTextField with default props', async () => {
    const { container } = render(<NicknameTextField value="FrostyBear" />)

    expect(container).toMatchSnapshot()
  })

  test('names the nickname generator and updates the value when activated', () => {
    const onChange = vi.fn()
    render(<NicknameTextField value="FrostyBear" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Generate nickname' }))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith(expect.any(String))
    expect(onChange).not.toHaveBeenCalledWith('FrostyBear')
  })
})
