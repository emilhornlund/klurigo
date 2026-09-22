import type { IconDefinition } from '@fortawesome/fontawesome-common-types'
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'
import { useState } from 'react'

import {
  CircularProgressBar,
  CircularProgressBarKind,
  CircularProgressBarSize,
  Surface,
} from '../../../../../../../components'
import { classNames } from '../../../../../../../utils/helpers'

import styles from './GameResultTable.module.scss'

export type TableItem = {
  type: 'table-row'
  badge: number
  value: string
  label?: string
  progress: number
  details?: {
    title: string
    value: string | number
    icon?: IconDefinition
    iconColor?: string
  }[]
}

export type TableSeparator = {
  type: 'table-separator'
}

export interface GameResultTableProps {
  items: (TableItem | TableSeparator)[]
}

const GameResultTableRow: FC<TableItem> = ({
  badge,
  value,
  label,
  progress,
  details,
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false)

  return (
    <Surface
      interactive
      key={`${badge}`}
      className={styles.tableRow}
      onClick={(event) => {
        event.preventDefault()
        setShowDetails(!showDetails)
      }}>
      <div className={styles.main}>
        <Surface interactive className={styles.badge}>{`${badge}`}</Surface>
        <div className={styles.value} title={value}>
          {value}
          {label && <div className={styles.label}>{label}</div>}
        </div>
        <div>
          <CircularProgressBar
            progress={progress}
            kind={CircularProgressBarKind.Correct}
            size={CircularProgressBarSize.Small}
            percentageColor="white"
          />
        </div>
        <div>
          <FontAwesomeIcon
            icon={showDetails ? faChevronUp : faChevronDown}
            color="white"
          />
        </div>
      </div>
      <div
        className={classNames(
          styles.details,
          showDetails ? styles.active : undefined,
        )}>
        {details?.map((item) => (
          <div key={item.title} className={styles.item}>
            <div className={styles.title}>
              {item.icon && (
                <FontAwesomeIcon icon={item.icon} color={item.iconColor} />
              )}
              <span>{item.title}</span>
            </div>
            <div className={styles.value}>{item.value}</div>
          </div>
        ))}
      </div>
    </Surface>
  )
}

const GameResultTable: FC<GameResultTableProps> = ({ items }) => {
  return (
    <div className={styles.table}>
      {items.map((item, index) =>
        item.type === 'table-row' ? (
          <GameResultTableRow
            key={`game-result-table-row-${index}`}
            {...item}
          />
        ) : (
          <div
            key={`game-result-table-separator-${index}`}
            className={styles.tableSeparator}
          />
        ),
      )}
    </div>
  )
}

export default GameResultTable
