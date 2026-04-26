import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ScoreChip from './ScoreChip'
import styles from './ScoreChip.module.scss'

describe('ScoreChip', () => {
  it('should render the score chip', () => {
    render(<ScoreChip value={1337} />)

    expect(screen.getByTestId('score-chip')).toBeInTheDocument()
  })

  it('should display the provided score value', () => {
    render(<ScoreChip value={1337} />)

    expect(screen.getByText('1337')).toBeInTheDocument()
  })

  it('should render zero correctly', () => {
    render(<ScoreChip value={0} />)

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should render negative values correctly', () => {
    render(<ScoreChip value={-25} />)

    expect(screen.getByText('-25')).toBeInTheDocument()
  })

  it('should apply the score chip test id to the root element', () => {
    render(<ScoreChip value={500} />)

    const chip = screen.getByTestId('score-chip')

    expect(chip).toHaveTextContent('500')
  })

  it('should render the normal size by default', () => {
    render(<ScoreChip value={1337} />)

    expect(screen.getByTestId('score-chip')).toHaveClass(styles.sizeNormal)
  })

  it('should render the normal size when explicitly provided', () => {
    render(<ScoreChip value={1337} size="normal" />)

    expect(screen.getByTestId('score-chip')).toHaveClass(styles.sizeNormal)
  })

  it('should render the small size when provided', () => {
    render(<ScoreChip value={1337} size="small" />)

    expect(screen.getByTestId('score-chip')).toHaveClass(styles.sizeSmall)
  })

  it('should match snapshot', () => {
    const { container } = render(<ScoreChip value={1337} />)

    expect(container.firstChild).toMatchSnapshot()
  })
})
