import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import * as hooks from './hooks'
import Typography from './Typography'

vi.mock('./hooks', async () => {
  const actual = await vi.importActual<typeof import('./hooks')>('./hooks')

  return {
    ...actual,
    useTextFit: vi.fn(() => null),
  }
})

describe('Typography', () => {
  it('renders a <p> by default (variant=body) with full size', () => {
    render(<Typography>Hello</Typography>)

    const el = screen.getByText('Hello')
    expect(el.tagName.toLowerCase()).toBe('p')
    expect(el).toHaveClass('typography')
    expect(el).toHaveClass('body')
    expect(el).toHaveClass('widthFull')
  })

  it('renders semantic elements for each variant', () => {
    const { rerender } = render(
      <Typography variant="extraLargeTitle">Hero</Typography>,
    )
    expect(screen.getByText('Hero').tagName.toLowerCase()).toBe('h1')

    rerender(<Typography variant="title">Title</Typography>)
    expect(screen.getByText('Title').tagName.toLowerCase()).toBe('h1')

    rerender(<Typography variant="title2">Subtitle</Typography>)
    expect(screen.getByText('Subtitle').tagName.toLowerCase()).toBe('h2')

    rerender(<Typography variant="title3">Title 3</Typography>)
    expect(screen.getByText('Title 3').tagName.toLowerCase()).toBe('h3')

    rerender(<Typography variant="title4">Title 4</Typography>)
    expect(screen.getByText('Title 4').tagName.toLowerCase()).toBe('h4')

    rerender(<Typography variant="title5">Title 5</Typography>)
    expect(screen.getByText('Title 5').tagName.toLowerCase()).toBe('h5')

    rerender(<Typography variant="body">Text</Typography>)
    expect(screen.getByText('Text').tagName.toLowerCase()).toBe('p')

    rerender(<Typography variant="body2">Body 2</Typography>)
    expect(screen.getByText('Body 2').tagName.toLowerCase()).toBe('p')

    rerender(
      <Typography variant="link" href="https://example.com">
        Link
      </Typography>,
    )
    expect(screen.getByText('Link').tagName.toLowerCase()).toBe('a')

    rerender(
      <Typography variant="link2" href="/secondary-link">
        Link 2
      </Typography>,
    )
    expect(screen.getByText('Link 2').tagName.toLowerCase()).toBe('a')

    rerender(<Typography variant="control">Control</Typography>)
    expect(screen.getByText('Control').tagName.toLowerCase()).toBe('p')

    rerender(<Typography variant="control2">Control 2</Typography>)
    expect(screen.getByText('Control 2').tagName.toLowerCase()).toBe('p')
  })

  it('applies size modifier classes', () => {
    const { rerender } = render(
      <Typography variant="body" width="small">
        Small
      </Typography>,
    )
    expect(screen.getByText('Small')).toHaveClass('widthSmall')

    rerender(
      <Typography variant="body" width="medium">
        Medium
      </Typography>,
    )
    expect(screen.getByText('Medium')).toHaveClass('widthMedium')

    rerender(
      <Typography variant="body" width="full">
        Full
      </Typography>,
    )
    expect(screen.getByText('Full')).toHaveClass('widthFull')
  })

  it('includes a custom className in the resolved classes', () => {
    render(
      <Typography variant="title" className="extra-class">
        Title
      </Typography>,
    )

    expect(screen.getByText('Title')).toHaveClass('extra-class')
  })

  it('forwards link attributes only for the link variant', () => {
    render(
      <Typography
        variant="link"
        href="/somewhere"
        target="_blank"
        rel="noreferrer"
        download="file.txt">
        Go
      </Typography>,
    )

    const el = screen.getByText('Go') as HTMLAnchorElement
    expect(el.tagName.toLowerCase()).toBe('a')
    expect(el.getAttribute('href')).toBe('/somewhere')
    expect(el.getAttribute('target')).toBe('_blank')
    expect(el.getAttribute('rel')).toBe('noreferrer')
    expect(el.getAttribute('download')).toBe('file.txt')
    expect(el).toHaveClass('link')
  })

  it('forwards link attributes for the link2 variant', () => {
    render(
      <Typography
        variant="link2"
        href="/secondary"
        target="_self"
        rel="noopener"
        download="secondary.txt">
        Secondary link
      </Typography>,
    )

    const el = screen.getByText('Secondary link') as HTMLAnchorElement
    expect(el.tagName.toLowerCase()).toBe('a')
    expect(el.getAttribute('href')).toBe('/secondary')
    expect(el.getAttribute('target')).toBe('_self')
    expect(el.getAttribute('rel')).toBe('noopener')
    expect(el.getAttribute('download')).toBe('secondary.txt')
    expect(el).toHaveClass('link2')
  })

  it('forwards aria attributes and data attributes', () => {
    render(
      <Typography
        variant="body"
        aria-label="Accessible label"
        aria-live="polite"
        data-testid="typography"
        data-tracking-id="abc123">
        Content
      </Typography>,
    )

    const el = screen.getByTestId('typography')
    expect(el).toHaveAttribute('aria-label', 'Accessible label')
    expect(el).toHaveAttribute('aria-live', 'polite')
    expect(el).toHaveAttribute('data-tracking-id', 'abc123')
  })

  it('forwards standard DOM props like id, title, role, and tabIndex', () => {
    render(
      <Typography
        variant="title2"
        id="title2-id"
        title="tooltip"
        role="heading"
        tabIndex={0}>
        Subtitle
      </Typography>,
    )

    const el = screen.getByText('Subtitle')
    expect(el).toHaveAttribute('id', 'title2-id')
    expect(el).toHaveAttribute('title', 'tooltip')
    expect(el).toHaveAttribute('role', 'heading')
    expect(el).toHaveAttribute('tabindex', '0')
  })

  it('forwards onClick and onKeyDown handlers', () => {
    const onClick = vi.fn()
    const onKeyDown = vi.fn()

    render(
      <Typography variant="body" onClick={onClick} onKeyDown={onKeyDown}>
        Clickable
      </Typography>,
    )

    const el = screen.getByText('Clickable')
    fireEvent.click(el)
    expect(onClick).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(el, { key: 'Enter' })
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })

  it('matches snapshot for extraLargeTitle variant', () => {
    const { asFragment } = render(
      <Typography variant="extraLargeTitle" width="medium">
        Let’s play
      </Typography>,
    )
    expect(asFragment()).toMatchSnapshot()
  })

  it('matches snapshot for title variant', () => {
    const { asFragment } = render(
      <Typography variant="title" width="small" align="left">
        Leaderboard
      </Typography>,
    )
    expect(asFragment()).toMatchSnapshot()
  })

  it('matches snapshot for link variant', () => {
    const { asFragment } = render(
      <Typography variant="link" href="/profile" width="full">
        Profile
      </Typography>,
    )
    expect(asFragment()).toMatchSnapshot()
  })

  it('renders the child element when asChild=true (does not render its own Tag)', () => {
    render(
      <Typography variant="title" asChild>
        <span>Child</span>
      </Typography>,
    )

    const el = screen.getByText('Child')
    expect(el.tagName.toLowerCase()).toBe('span')

    expect(el).toHaveClass('typography')
    expect(el).toHaveClass('title')
    expect(el).toHaveClass('widthFull')
  })

  it('merges child className with Typography classes when asChild=true', () => {
    render(
      <Typography variant="title2" width="small" asChild className="outer">
        <span className="inner">Merged</span>
      </Typography>,
    )

    const el = screen.getByText('Merged')
    expect(el).toHaveClass('inner')
    expect(el).toHaveClass('outer')

    expect(el).toHaveClass('typography')
    expect(el).toHaveClass('title2')
    expect(el).toHaveClass('widthSmall')
  })

  it('forwards aria and data attributes onto the child element when asChild=true', () => {
    render(
      <Typography
        variant="body"
        asChild
        aria-label="Label"
        aria-hidden="true"
        data-testid="child"
        data-tracking-id="track">
        <button type="button">Button</button>
      </Typography>,
    )

    const el = screen.getByTestId('child')
    expect(el.tagName.toLowerCase()).toBe('button')
    expect(el).toHaveAttribute('aria-label', 'Label')
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el).toHaveAttribute('data-tracking-id', 'track')
  })

  it('forwards event handlers onto the child element when asChild=true', () => {
    const onClick = vi.fn()
    const onKeyDown = vi.fn()

    render(
      <Typography
        variant="body"
        asChild
        onClick={onClick}
        onKeyDown={onKeyDown}>
        <div tabIndex={0}>Interactive</div>
      </Typography>,
    )

    const el = screen.getByText('Interactive')
    fireEvent.click(el)
    expect(onClick).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(el, { key: 'Enter' })
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })

  it('throws when asChild=true and children is not a valid React element', () => {
    const renderInvalid = () =>
      render(
        <Typography variant="body" asChild>
          {'Not an element'}
        </Typography>,
      )

    expect(renderInvalid).toThrowError(
      'Typography with `asChild` expects a single valid React element',
    )
  })

  it('allows composing with an <a> child to avoid nested anchors (single anchor in output)', () => {
    const { container } = render(
      <Typography variant="link" width="small" asChild>
        <a href="/quiz/create">Create your own quiz</a>
      </Typography>,
    )

    const anchors = container.querySelectorAll('a')
    expect(anchors).toHaveLength(1)

    const el = screen.getByText('Create your own quiz')
    expect(el.tagName.toLowerCase()).toBe('a')
    expect(el).toHaveAttribute('href', '/quiz/create')
    expect(el).toHaveClass('typography')
    expect(el).toHaveClass('link')
    expect(el).toHaveClass('widthSmall')
  })

  it('matches snapshot for asChild composition', () => {
    const { asFragment } = render(
      <Typography variant="link" width="small" asChild className="outer">
        <a href="/quiz/create" className="inner">
          Create your own quiz
        </a>
      </Typography>,
    )

    expect(asFragment()).toMatchSnapshot()
  })

  it('applies center alignment by default when align is not provided', () => {
    render(<Typography>Centered</Typography>)

    const el = screen.getByText('Centered')
    expect(el).toHaveClass('alignCenter')
  })

  it('applies alignment modifier classes', () => {
    const { rerender } = render(<Typography align="center">Center</Typography>)
    expect(screen.getByText('Center')).toHaveClass('alignCenter')

    rerender(<Typography align="justify">Justify</Typography>)
    expect(screen.getByText('Justify')).toHaveClass('alignJustify')

    rerender(<Typography align="left">Left</Typography>)
    expect(screen.getByText('Left')).toHaveClass('alignLeft')

    rerender(<Typography align="right">Right</Typography>)
    expect(screen.getByText('Right')).toHaveClass('alignRight')
  })

  it('applies alignment modifier classes when asChild=true', () => {
    render(
      <Typography variant="body" align="right" asChild>
        <span>Aligned child</span>
      </Typography>,
    )

    const el = screen.getByText('Aligned child')
    expect(el).toHaveClass('alignRight')
  })

  it('applies inverse color by default when color is not provided', () => {
    render(<Typography>Default color</Typography>)

    const el = screen.getByText('Default color')
    expect(el).toHaveClass('colorInverse')
  })

  it('applies color modifier classes', () => {
    const { rerender } = render(
      <Typography color="default">Default</Typography>,
    )
    expect(screen.getByText('Default')).toHaveClass('colorDefault')

    rerender(<Typography color="subtle">Subtle</Typography>)
    expect(screen.getByText('Subtle')).toHaveClass('colorSubtle')

    rerender(<Typography color="muted">Muted</Typography>)
    expect(screen.getByText('Muted')).toHaveClass('colorMuted')

    rerender(<Typography color="disabled">Disabled</Typography>)
    expect(screen.getByText('Disabled')).toHaveClass('colorDisabled')

    rerender(<Typography color="inverse">Inverse</Typography>)
    expect(screen.getByText('Inverse')).toHaveClass('colorInverse')

    rerender(<Typography color="inverseSubtle">Inverse subtle</Typography>)
    expect(screen.getByText('Inverse subtle')).toHaveClass('colorInverseSubtle')

    rerender(<Typography color="success">Success</Typography>)
    expect(screen.getByText('Success')).toHaveClass('colorSuccess')

    rerender(<Typography color="danger">Danger</Typography>)
    expect(screen.getByText('Danger')).toHaveClass('colorDanger')

    rerender(<Typography color="warning">Warning</Typography>)
    expect(screen.getByText('Warning')).toHaveClass('colorWarning')

    rerender(<Typography color="warningSoft">Warning soft</Typography>)
    expect(screen.getByText('Warning soft')).toHaveClass('colorWarningSoft')

    rerender(<Typography color="emphasis">Emphasis</Typography>)
    expect(screen.getByText('Emphasis')).toHaveClass('colorEmphasis')
  })

  it('applies variant classes for all variants', () => {
    const { rerender } = render(
      <Typography variant="extraLargeTitle">Hero</Typography>,
    )
    expect(screen.getByText('Hero')).toHaveClass('extraLargeTitle')

    rerender(<Typography variant="title">Title</Typography>)
    expect(screen.getByText('Title')).toHaveClass('title')

    rerender(<Typography variant="title2">Title 2</Typography>)
    expect(screen.getByText('Title 2')).toHaveClass('title2')

    rerender(<Typography variant="title3">Title 3</Typography>)
    expect(screen.getByText('Title 3')).toHaveClass('title3')

    rerender(<Typography variant="title4">Title 4</Typography>)
    expect(screen.getByText('Title 4')).toHaveClass('title4')

    rerender(<Typography variant="title5">Title 5</Typography>)
    expect(screen.getByText('Title 5')).toHaveClass('title5')

    rerender(<Typography variant="body">Body</Typography>)
    expect(screen.getByText('Body')).toHaveClass('body')

    rerender(<Typography variant="body2">Body 2</Typography>)
    expect(screen.getByText('Body 2')).toHaveClass('body2')

    rerender(<Typography variant="control">Control</Typography>)
    expect(screen.getByText('Control')).toHaveClass('control')

    rerender(<Typography variant="control2">Control 2</Typography>)
    expect(screen.getByText('Control 2')).toHaveClass('control2')

    rerender(
      <Typography variant="link" href="/link">
        Link
      </Typography>,
    )
    expect(screen.getByText('Link')).toHaveClass('link')

    rerender(
      <Typography variant="link2" href="/secondary-link">
        Link 2
      </Typography>,
    )
    expect(screen.getByText('Link 2')).toHaveClass('link2')
  })

  it('applies color modifier classes when asChild=true', () => {
    render(
      <Typography variant="body" color="danger" asChild>
        <span>Danger child</span>
      </Typography>,
    )

    const el = screen.getByText('Danger child')
    expect(el).toHaveClass('colorDanger')
  })

  it('applies noOpacity, noWrap, truncate, and bold classes', () => {
    render(
      <Typography noOpacity noWrap truncate bold>
        Styled text
      </Typography>,
    )

    const el = screen.getByText('Styled text')
    expect(el).toHaveClass('noOpacity')
    expect(el).toHaveClass('noWrap')
    expect(el).toHaveClass('truncate')
    expect(el).toHaveClass('bold')
  })

  it('applies noOpacity, noWrap, truncate, and bold classes when asChild=true', () => {
    render(
      <Typography variant="body" noOpacity noWrap truncate bold asChild>
        <span>Styled child</span>
      </Typography>,
    )

    const el = screen.getByText('Styled child')
    expect(el).toHaveClass('noOpacity')
    expect(el).toHaveClass('noWrap')
    expect(el).toHaveClass('truncate')
    expect(el).toHaveClass('bold')
  })

  it('does not apply inline text fit styles when useTextFit returns null', () => {
    vi.mocked(hooks.useTextFit).mockReturnValueOnce(null)

    render(
      <Typography variant="body" maxLines={2}>
        Plain text
      </Typography>,
    )

    const el = screen.getByText('Plain text')
    expect(el).not.toHaveStyle('--fitted-font-size: 20px')
    expect(el).not.toHaveClass('textFitEnabled')
  })

  it('applies inline text fit styles when useTextFit returns valid values', () => {
    vi.mocked(hooks.useTextFit).mockReturnValueOnce({
      fontSize: 18,
      lineHeight: 24,
    })

    render(
      <Typography variant="body" maxLines={2}>
        Fitted text
      </Typography>,
    )

    const el = screen.getByText('Fitted text')
    expect(el).toHaveClass('textFitEnabled')
    expect(el).toHaveStyle({
      '--fitted-font-size': '18px',
      '--fitted-line-height': '24px',
      '--max-lines': '2',
    })
  })

  it('does not apply inline text fit styles when fitted values are invalid', () => {
    vi.mocked(hooks.useTextFit).mockReturnValueOnce({
      fontSize: Number.NaN,
      lineHeight: 24,
    })

    render(
      <Typography variant="body" maxLines={2}>
        Invalid fitted text
      </Typography>,
    )

    const el = screen.getByText('Invalid fitted text')
    expect(el).not.toHaveClass('textFitEnabled')
    expect(el.getAttribute('style')).toBeNull()
  })

  it('applies inline text fit styles onto the child element when asChild=true', () => {
    vi.mocked(hooks.useTextFit).mockReturnValueOnce({
      fontSize: 16,
      lineHeight: 22,
    })

    render(
      <Typography variant="body" maxLines={3} asChild>
        <span>Fitted child</span>
      </Typography>,
    )

    const el = screen.getByText('Fitted child')
    expect(el).toHaveClass('textFitEnabled')
    expect(el).toHaveStyle({
      '--fitted-font-size': '16px',
      '--fitted-line-height': '22px',
      '--max-lines': '3',
    })
  })

  it('handles non-string children without applying text fit styles by default', () => {
    render(
      <Typography variant="body" maxLines={2}>
        <span>Nested content</span>
      </Typography>,
    )

    const el = screen.getByText('Nested content')
    expect(el.parentElement).toHaveClass('body')
  })

  it('matches snapshot for body variant with semantic color', () => {
    const { asFragment } = render(
      <Typography variant="body" color="success" align="left" width="medium">
        Saved successfully
      </Typography>,
    )

    expect(asFragment()).toMatchSnapshot()
  })
})
