import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import RailHeader from './RailHeader'

describe('RailHeader', () => {
  it('renders the title', () => {
    render(<RailHeader title="Trending" />)
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(
      'Trending',
    )
  })

  it('renders the description when provided', () => {
    render(<RailHeader title="Trending" description="Most recent activity" />)
    expect(screen.getByText('Most recent activity')).toBeInTheDocument()
  })

  it('does not render a description element when not provided', () => {
    const { container } = render(<RailHeader title="Trending" />)
    expect(container.querySelector('p')).not.toBeInTheDocument()
  })

  it('renders the action when provided', () => {
    render(
      <RailHeader title="Trending" action={<a href="/see-all">See all</a>} />,
    )
    expect(screen.getByRole('link', { name: 'See all' })).toBeInTheDocument()
  })

  it('does not render an action when not provided', () => {
    render(<RailHeader title="Trending" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('matches snapshot with all props', () => {
    const { container } = render(
      <RailHeader
        title="Top Rated"
        description="Hand-picked quizzes"
        action={<a href="/see-all">See all</a>}
      />,
    )
    expect(container).toMatchSnapshot()
  })

  it('matches snapshot with title only', () => {
    const { container } = render(<RailHeader title="Featured" />)
    expect(container).toMatchSnapshot()
  })
})
