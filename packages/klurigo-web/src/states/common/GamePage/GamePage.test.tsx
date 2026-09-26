import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PageMock: vi.fn(({ header, hideLogin, children }: any) => (
      <div data-testid="page" data-hide-login={hideLogin ? 'true' : 'false'}>
        <div data-testid="header">{header}</div>
        <div data-testid="content">{children}</div>
      </div>
    )),
  }
})

vi.mock('../../../components', () => ({
  Page: h.PageMock,
}))

import GamePage from './GamePage'

describe('GamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Page with header and children and sets hideLogin', () => {
    const { container } = render(
      <GamePage
        layout="contained"
        header={<div data-testid="custom-header">H</div>}>
        <div data-testid="slot">Body</div>
      </GamePage>,
    )

    expect(screen.getByTestId('page')).toBeInTheDocument()
    expect(screen.getByTestId('page')).toHaveAttribute(
      'data-hide-login',
      'true',
    )
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('custom-header')).toBeInTheDocument()
    expect(screen.getByTestId('content')).toHaveTextContent('Body')

    expect(container).toMatchSnapshot()
  })
})
