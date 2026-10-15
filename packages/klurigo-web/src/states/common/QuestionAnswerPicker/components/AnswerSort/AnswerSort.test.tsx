import { QuestionType } from '@klurigo/common'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import AnswerSort from './AnswerSort'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mock('../../../../../components', async (orig: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual: any = await orig()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SortableTable = ({ values, disabled, onChange }: any) => (
    <div data-testid="sortable" data-disabled={disabled ? 'true' : 'false'}>
      <ul>
        {values.map((v: { id: string; value: string }, idx: number) => (
          <li key={v.id} data-id={v.id} data-value={v.value}>
            <span>{v.value}</span>
            <button
              type="button"
              aria-label={`move-down-${idx}`}
              onClick={() => {
                if (idx < values.length - 1) {
                  const next = [...values]
                  ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
                  onChange?.(next)
                }
              }}>
              ↓
            </button>
            <button
              type="button"
              aria-label={`move-up-${idx}`}
              onClick={() => {
                if (idx > 0) {
                  const next = [...values]
                  ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                  onChange?.(next)
                }
              }}>
              ↑
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
  return { ...actual, SortableTable }
})

describe('AnswerSort', () => {
  it('renders interactive table with initial values', () => {
    const { container } = render(
      <AnswerSort
        values={['Alpha', 'Beta', 'Gamma']}
        interactive
        loading={false}
        onSubmit={vi.fn()}
      />,
    )
    const sortable = screen.getByTestId('sortable')
    expect(sortable).toHaveAttribute('data-disabled', 'false')
    const items = within(sortable).getAllByRole('listitem')
    expect(items.map((li) => li.getAttribute('data-value'))).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ])
    expect(container).toMatchSnapshot()
  })

  it('generates stable ids using value+index', () => {
    render(
      <AnswerSort
        values={['New York', 'Los Angeles', 'Rome']}
        interactive
        loading={false}
        onSubmit={vi.fn()}
      />,
    )
    const sortable = screen.getByTestId('sortable')
    const items = within(sortable).getAllByRole('listitem')
    expect(items[0]).toHaveAttribute('data-id', 'New-York_0')
    expect(items[1]).toHaveAttribute('data-id', 'Los-Angeles_1')
    expect(items[2]).toHaveAttribute('data-id', 'Rome_2')
  })

  it('reorders via SortableTable and submits new order', () => {
    const onSubmit = vi.fn()
    render(
      <AnswerSort
        values={['Red', 'Green', 'Blue']}
        interactive
        loading={false}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByLabelText('move-down-0'))

    const sortable = screen.getByTestId('sortable')
    const valuesAfter = within(sortable)
      .getAllByRole('listitem')
      .map((li) => li.getAttribute('data-value'))
    expect(valuesAfter).toEqual(['Green', 'Red', 'Blue'])

    fireEvent.click(screen.getByRole('button', { name: /submit my answer/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(['Green', 'Red', 'Blue'])
  })

  it('moves an item up and submits', () => {
    const onSubmit = vi.fn()
    render(
      <AnswerSort
        values={['One', 'Two', 'Three']}
        interactive
        loading={false}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.click(screen.getByLabelText('move-down-0'))
    fireEvent.click(screen.getByLabelText('move-up-2'))

    const sortable = screen.getByTestId('sortable')
    const valuesAfter = within(sortable)
      .getAllByRole('listitem')
      .map((li) => li.getAttribute('data-value'))
    expect(valuesAfter).toEqual(['Two', 'Three', 'One'])

    fireEvent.click(screen.getByRole('button', { name: /submit my answer/i }))
    expect(onSubmit).toHaveBeenCalledWith(['Two', 'Three', 'One'])
  })

  it('restores the submitted order when the answer event arrives', () => {
    const { rerender } = render(
      <AnswerSort
        values={['Alpha', 'Beta', 'Gamma']}
        interactive
        loading={false}
        onSubmit={vi.fn()}
      />,
    )

    rerender(
      <AnswerSort
        values={['Alpha', 'Beta', 'Gamma']}
        interactive
        loading={false}
        onSubmit={vi.fn()}
        submittedAnswer={{
          type: QuestionType.Puzzle,
          value: ['Gamma', 'Alpha', 'Beta'],
        }}
      />,
    )

    const values = within(screen.getByTestId('sortable'))
      .getAllByRole('listitem')
      .map((item) => item.getAttribute('data-value'))
    expect(values).toEqual(['Gamma', 'Alpha', 'Beta'])
    expect(
      screen.getByRole('button', { name: /submit my answer/i }),
    ).toBeDisabled()
  })

  it('disables interaction and hides submit button in non-interactive mode', () => {
    const { container } = render(
      <AnswerSort
        values={['A', 'B']}
        interactive={false}
        loading={false}
        onSubmit={vi.fn()}
      />,
    )
    const sortable = screen.getByTestId('sortable')
    expect(sortable).toHaveAttribute('data-disabled', 'true')
    expect(
      screen.queryByRole('button', { name: /submit my answer/i }),
    ).not.toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('handles empty list', () => {
    const { container } = render(
      <AnswerSort values={[]} interactive loading={false} onSubmit={vi.fn()} />,
    )
    const sortable = screen.getByTestId('sortable')
    expect(within(sortable).queryAllByRole('listitem')).toHaveLength(0)
    expect(container).toMatchSnapshot()
  })
})
