import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'

import Page from './Page'

describe('Page', () => {
  test('should render contained Page', () => {
    const { container } = render(
      <MemoryRouter>
        <Page layout="contained">Content</Page>
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  test('should render Page with header', () => {
    const { container } = render(
      <MemoryRouter>
        <Page
          layout="contained"
          header={
            <>
              <a href="#">Link1</a>
              <a href="#">Link2</a>
            </>
          }>
          Content
        </Page>
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  test('should render Page with profile', () => {
    const { container } = render(
      <MemoryRouter>
        <Page layout="contained" profile>
          Content
        </Page>
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  test('should render full bleed treatment independently of layout', () => {
    const { container } = render(
      <MemoryRouter>
        <Page layout="fill" fullBleed footer={<a>Footer</a>}>
          Content
        </Page>
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  test.each(['contained', 'compact', 'fill', 'compactFill'] as const)(
    '%s applies its geometry class',
    (layout) => {
      const { container } = render(
        <MemoryRouter>
          <Page layout={layout} align="start">
            Content
          </Page>
        </MemoryRouter>,
      )

      const content = container.querySelector('.content')
      expect(content).toHaveClass(layout, 'startAlign')
      expect(content).not.toHaveClass('fullBleed')
      for (const otherLayout of [
        'contained',
        'compact',
        'fill',
        'compactFill',
      ]) {
        if (otherLayout !== layout) expect(content).not.toHaveClass(otherLayout)
      }
      expect(content?.querySelector('.contentWrapper')).toHaveClass(
        'contentWrapper',
      )
    },
  )
})
