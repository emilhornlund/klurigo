import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import Accordion from './Accordion'

describe('Accordion', () => {
  it('keeps collapsed content out of the tab order and toggles with the keyboard', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Accordion
          title="Game rules"
          description="Read the rules before playing">
          <a href="#scoring">Scoring</a>
        </Accordion>
        <button type="button">Continue</button>
      </>,
    )

    const toggle = screen.getByRole('button', {
      name: 'Game rules',
      expanded: false,
    })
    expect(toggle).toHaveAccessibleDescription('Read the rules before playing')
    await user.tab()
    expect(toggle).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus()

    await user.tab({ shift: true })
    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      document.getElementById(toggle.getAttribute('aria-controls')!),
    ).toContainElement(screen.getByRole('link', { name: 'Scoring' }))
    await user.tab()
    expect(screen.getByRole('link', { name: 'Scoring' })).toHaveFocus()
    await user.tab({ shift: true })
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
    expect(
      screen.queryByRole('link', { name: 'Scoring' }),
    ).not.toBeInTheDocument()
  })

  it('supports different heading levels and independent panels', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Accordion title="Game rules" headingLevel={3} defaultExpanded>
          How the game works
        </Accordion>
        <Accordion title="Scoring">How points are awarded</Accordion>
      </>,
    )

    expect(
      screen.getByRole('heading', { name: 'Game rules', level: 3 }),
    ).toBeVisible()
    const rules = screen.getByRole('button', {
      name: 'Game rules',
      expanded: true,
    })
    const scoring = screen.getByRole('button', {
      name: 'Scoring',
      expanded: false,
    })
    expect(rules).not.toHaveAccessibleDescription()
    expect(rules.getAttribute('aria-controls')).not.toBe(
      scoring.getAttribute('aria-controls'),
    )
    await user.click(scoring)
    expect(screen.getByText('How points are awarded')).toBeVisible()
    expect(screen.getByText('How the game works')).toBeVisible()
  })
})
