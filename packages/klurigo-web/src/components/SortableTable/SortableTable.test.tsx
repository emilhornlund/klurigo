// packages/quiz/src/components/SortableTable/SortableTable.test.tsx
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---- Mocks (must come before component import) ----
vi.mock('../../styles/colors.module.scss', () => ({
  default: { gray4: '#999999' },
}))

vi.mock('./SortableTable.module.scss', () => ({
  default: {
    sortableTable: 'sortableTable',
    item: 'item',
    draggable: 'draggable',
    value: 'value',
    icon: 'icon',
  },
}))

vi.mock('../../utils/helpers', () => ({
  classNames: (...cls: Array<string | undefined | null | false>) =>
    cls.filter(Boolean).join(' '),
}))

// Minimal, predictable FontAwesome mock
vi.mock('@fortawesome/react-fontawesome', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FontAwesomeIcon: (props: any) => (
    <i
      data-mock="fa"
      data-icon={(props?.icon && props.icon.iconName) || 'faGrip'}
      className={props.className}
    />
  ),
}))

// dnd-kit mocks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lastDndHandlers: { onDragEnd?: (evt: any) => void } = {}

vi.mock('@dnd-kit/core', () => {
  return {
    // Render children and expose a test button to trigger onDragEnd
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DndContext: ({ onDragEnd, children }: any) => {
      lastDndHandlers.onDragEnd = onDragEnd
      return (
        <div data-testid="dnd-context">
          {children}
          <button
            type="button"
            data-testid="trigger-drag"
            onClick={() =>
              onDragEnd?.({
                active: { id: '1' },
                over: { id: '2' },
              })
            }
          />
        </div>
      )
    },
    closestCenter: vi.fn(),
    useSensor: vi.fn().mockReturnValue({}),
    useSensors: vi.fn().mockReturnValue([]),
    PointerSensor: vi.fn(),
    TouchSensor: vi.fn(),
    KeyboardSensor: vi.fn(),
  }
})

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToVerticalAxis: vi.fn(),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: (t: unknown) => (t ? String(t) : ''),
    },
  },
}))

vi.mock('@dnd-kit/sortable', () => ({
  // Deterministic arrayMove used by the component logic
  arrayMove: <T,>(arr: T[], from: number, to: number): T[] => {
    const copy = arr.slice()
    const [item] = copy.splice(from, 1)
    copy.splice(to, 0, item)
    return copy
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SortableContext: ({ children }: any) => <>{children}</>,
  verticalListSortingStrategy: vi.fn(),
  sortableKeyboardCoordinates: vi.fn(),
  // Make useSortable return stable, no-op handlers
  useSortable: ({ id }: { id: string }) => ({
    attributes: { 'data-sortable-id': id },
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
  }),
}))

// ---- Import the component under test (after mocks) ----
import SortableTable, { type SortableTableValue } from './SortableTable'

const sampleValues: SortableTableValue[] = [
  { id: '1', value: 'Alpha' }, // no custom icon -> default grip shows when enabled
  { id: '2', value: 'Bravo' },
  { id: '3', value: 'Charlie' },
]

describe('SortableTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial list (enabled) and matches snapshot', () => {
    const { container } = render(<SortableTable values={sampleValues} />)

    // Expect a grip icon (mocked <i data-mock="fa"/>) to exist for items without custom icon when not disabled
    expect(screen.getAllByTestId('dnd-context')).toHaveLength(1)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('renders with disabled=true (no grip icons) and matches snapshot', () => {
    const { container, queryAllByTestId } = render(
      <SortableTable values={sampleValues} disabled />,
    )

    // No mocked <i data-mock="fa" ...> are rendered when disabled
    expect(queryAllByTestId('dnd-context')).toHaveLength(1)
    // Snapshot of disabled DOM
    expect(container.firstChild).toMatchSnapshot()
  })

  it('calls onChange on mount with initial order', () => {
    const onChange = vi.fn()
    render(<SortableTable values={sampleValues} onChange={onChange} />)
    // Fires once on mount due to lastOrderRef comparison
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(sampleValues)
  })

  it('reorders on drag end and calls onChange with new order', async () => {
    const onChange = vi.fn()
    const { container } = render(
      <SortableTable values={sampleValues.slice(0, 2)} onChange={onChange} />,
    )

    // Initial onChange
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith([
      { id: '1', value: 'Alpha' },
      { id: '2', value: 'Bravo' },
    ])

    // Trigger a drag from id=1 over id=2 -> order becomes [2,1]
    await act(async () => {
      screen.getByTestId('trigger-drag').click()
    })

    // Wait for state update + useEffect to fire onChange again
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2))
    expect(onChange).toHaveBeenLastCalledWith([
      { id: '2', value: 'Bravo' },
      { id: '1', value: 'Alpha' },
    ])

    // Snapshot the DOM after reorder
    expect(container.firstChild).toMatchSnapshot()
  })

  it('updates when values prop changes and calls onChange with updated list', () => {
    const onChange = vi.fn()
    const { rerender, container } = render(
      <SortableTable values={sampleValues.slice(0, 2)} onChange={onChange} />,
    )
    expect(onChange).toHaveBeenCalledTimes(1)

    // Push new props: add a third item
    const updated = [...sampleValues.slice(0, 2), { id: '9', value: 'Delta' }]
    rerender(<SortableTable values={updated} onChange={onChange} />)

    // Should call onChange once more with the new values
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(updated)

    // Snapshot of updated DOM
    expect(container.firstChild).toMatchSnapshot()
  })
})
