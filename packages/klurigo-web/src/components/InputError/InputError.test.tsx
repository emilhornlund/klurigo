import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import InputError from './InputError'

describe('InputError', () => {
  it('should render the provided message', () => {
    render(<InputError message="Something went wrong" />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should render the error icon', () => {
    const { container } = render(<InputError message="Something went wrong" />)

    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
