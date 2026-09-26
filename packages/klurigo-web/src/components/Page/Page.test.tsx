import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'

import Page from './Page'

describe('Page', () => {
  test('should render Page with default props', async () => {
    const { container } = render(
      <MemoryRouter>
        <Page>Content</Page>
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  test('should render Page with header', async () => {
    const { container } = render(
      <MemoryRouter>
        <Page
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

  test('should render Page with profile', async () => {
    const { container } = render(
      <MemoryRouter>
        <Page profile>Content</Page>
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  test('should render Page with full bleed layout', async () => {
    const { container } = render(
      <MemoryRouter>
        <Page
          layout="fullBleed"
          width="full"
          height="full"
          footer={<a>Footer</a>}>
          Content
        </Page>
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  test('should render Page with large width', async () => {
    const { container } = render(
      <MemoryRouter>
        <Page width="large">Content</Page>
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  test('should render Page with full width', async () => {
    const { container } = render(
      <MemoryRouter>
        <Page width="full">Content</Page>
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })
})
