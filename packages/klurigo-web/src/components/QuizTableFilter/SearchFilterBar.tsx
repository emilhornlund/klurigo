import { faFilter, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { classNames } from '../../utils/helpers'
import Button from '../Button'
import TextField from '../TextField'

import styles from './QuizTableFilter.module.scss'

type SearchFilterBarProps<T extends { search?: string }> = {
  filter: T
  searchLabel: string
  onChange?: (options: T) => void
  renderModal: (props: {
    filter: T
    open: boolean
    onClose: () => void
    onApply: (options: Omit<T, 'search'>) => void
  }) => ReactNode
}

/** Shares the Quiz Shelf search controls and submission behavior. */
const SearchFilterBar = <T extends { search?: string }>({
  filter,
  searchLabel,
  onChange,
  renderModal,
}: SearchFilterBarProps<T>) => {
  const [draft, setDraft] = useState(filter)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setDraft(filter)
  }, [filter])

  return (
    <>
      <div className={styles.quizTableFilter}>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onChange?.(draft)
          }}>
          <div className={classNames(styles.column, styles.full)}>
            <TextField
              id="search-textfield"
              type="text"
              placeholder="Search"
              value={draft.search}
              onChange={(value) =>
                setDraft({ ...draft, search: value as string })
              }
            />
          </div>
          <div className={styles.column}>
            <Button
              id="search-button"
              type="button"
              variant="primary"
              surface="brand"
              icon={faMagnifyingGlass}
              aria-label={searchLabel}
              onClick={() => onChange?.(draft)}
            />
          </div>
          <div className={styles.column}>
            <Button
              id="filter-button"
              type="button"
              variant="primary"
              surface="brand"
              icon={faFilter}
              aria-label="Open filters"
              onClick={() => setOpen(true)}
            />
          </div>
        </form>
      </div>
      {renderModal({
        filter: draft,
        open,
        onClose: () => setOpen(false),
        onApply: (options) => {
          const next = { ...draft, ...options }
          setOpen(false)
          setDraft(next)
          onChange?.(next)
        },
      })}
    </>
  )
}

export default SearchFilterBar
