import { join } from 'node:path'

import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { compile } from 'sass'
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

  test('should render full bleed layout with full-width and full-height geometry', () => {
    const { container } = render(
      <MemoryRouter>
        <Page layout="fullBleed" footer={<a>Footer</a>}>
          Content
        </Page>
      </MemoryRouter>,
    )

    expect(container.querySelector('.header')).toHaveClass('fullBleed')
    expect(container.querySelector('.content')).toHaveClass(
      'content',
      'fullBleed',
      'centerAlign',
    )
    expect(container.querySelector('.footer')).toHaveClass('fullBleed')
    expect(container.querySelector('.contentWrapper')).toHaveClass(
      'contentWrapper',
    )
    expect(container.querySelector('.contentInner')).toHaveClass('contentInner')
    expect(container).toMatchSnapshot()
  })

  test('fullBleed CSS fills the content width and height', () => {
    const css = compile(
      join(process.cwd(), 'src/components/Page/Page.module.scss'),
    ).css

    expect(css).toMatch(
      /\.content\.fullBleed > \.contentWrapper\s*\{\s*width: 100%;\s*\}/,
    )
    expect(css).toMatch(
      /\.content\.fullBleed > \.contentWrapper\s*\{\s*height: 100%;\s*\}/,
    )
    expect(css).toMatch(
      /\.content\.fullBleed > \.contentWrapper > \.contentInner\s*\{\s*flex: 1;\s*height: 100%;\s*\}/,
    )
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
