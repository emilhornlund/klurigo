import type { DragEndEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { IconDefinition } from '@fortawesome/fontawesome-common-types'
import { faGrip } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'

import colors from '../../styles/colors.tokens.module.scss'
import { classNames } from '../../utils/helpers'

import styles from './SortableTable.module.scss'

export type SortableTableValue = {
  id: string
  value: string
  icon?: IconDefinition
  iconColor?: string
}

export type SortableTableProps = {
  values?: SortableTableValue[]
  disabled?: boolean
  onChange?: (values: SortableTableValue[]) => void
}

type SortableItemProps = {
  id: string
  disabled?: boolean
  dropAnimation?: string | null
} & Pick<SortableTableValue, 'value' | 'icon' | 'iconColor'>

const SortableItem: FC<SortableItemProps> = ({
  id,
  disabled,
  dropAnimation,
  value,
  icon,
  iconColor = colors.colorTextDefault,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      className={classNames(
        styles.item,
        !disabled ? styles.draggable : undefined,
        dropAnimation === id ? styles.dropSuccess : undefined,
      )}
      style={style}
      {...attributes}
      {...listeners}>
      <div className={styles.value}>{value}</div>

      {!disabled && !icon && (
        <FontAwesomeIcon
          icon={faGrip}
          color={iconColor}
          className={styles.icon}
        />
      )}
      {icon && (
        <FontAwesomeIcon
          icon={icon}
          color={iconColor}
          className={styles.icon}
        />
      )}
    </div>
  )
}

const SortableTable: FC<SortableTableProps> = ({
  values = [],
  disabled = false,
  onChange = () => undefined,
}) => {
  const [internalValues, setInternalValues] = useState(values)
  const [dropAnimation, setDropAnimation] = useState<string | null>(null)

  useEffect(() => {
    setInternalValues(values)
  }, [values])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const lastOrderRef = useRef<string>('')
  useEffect(() => {
    const tmpLastOrderRef = internalValues.map(({ id }) => id).join(',')
    if (lastOrderRef.current !== tmpLastOrderRef) {
      lastOrderRef.current = tmpLastOrderRef
      onChange(internalValues)
    }
  }, [internalValues, onChange])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active?.id !== over?.id) {
      // Trigger drop animation
      setDropAnimation(active.id as string)
      setTimeout(() => setDropAnimation(null), 400)

      setInternalValues((items) => {
        const oldIndex = items.findIndex(({ id }) => id === active.id)
        const newIndex = items.findIndex(({ id }) => id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className={styles.sortableTable}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}>
        <SortableContext
          items={internalValues}
          strategy={verticalListSortingStrategy}>
          {internalValues.map((value) => (
            <SortableItem
              {...value}
              disabled={disabled}
              dropAnimation={dropAnimation}
              key={value.id}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}

export default SortableTable
