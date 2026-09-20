import { faFilter, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import {
  GameMode,
  LanguageCode,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import type { FC, FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { classNames } from '../../utils/helpers'
import Button from '../Button'
import TextField from '../TextField'

import FilterModal from './components/FilterModal'
import styles from './QuizTableFilter.module.scss'

export interface FilterOptions {
  search?: string
  visibility?: QuizVisibility
  category?: QuizCategory
  languageCode?: LanguageCode
  mode?: GameMode
  sort?: 'title' | 'created' | 'updated'
  order?: 'asc' | 'desc'
}

export interface QuizTableFilterProps {
  filter: FilterOptions
  showVisibilityFilter?: boolean
  onChange?: (options: FilterOptions) => void
}

const QuizTableFilter: FC<QuizTableFilterProps> = ({
  filter,
  showVisibilityFilter = false,
  onChange,
}) => {
  const [internalFilter, setInternalFilter] = useState<FilterOptions>(filter)

  useEffect(() => {
    setInternalFilter(filter)
  }, [filter])

  const [showFilterModal, setShowFilterModal] = useState(false)

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault()
    onChange?.(internalFilter)
  }

  const handleSearch = (): void => {
    onChange?.(internalFilter)
  }

  const handleApplyFilter = (options: Omit<FilterOptions, 'search'>) => {
    setShowFilterModal(false)
    const newFilter: FilterOptions = { ...internalFilter, ...options }
    setInternalFilter(newFilter)
    onChange?.(newFilter)
  }

  return (
    <>
      <div className={styles.quizTableFilter}>
        <form onSubmit={handleSubmit}>
          <div className={classNames(styles.column, styles.full)}>
            <TextField
              id="search-textfield"
              type="text"
              placeholder="Search"
              value={internalFilter.search}
              onChange={(value) =>
                setInternalFilter({
                  ...internalFilter,
                  search: value as string,
                })
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
              onClick={handleSearch}
            />
          </div>
          <div className={styles.column}>
            <Button
              id="filter-button"
              type="button"
              variant="primary"
              surface="brand"
              icon={faFilter}
              onClick={() => setShowFilterModal(true)}
            />
          </div>
        </form>
      </div>
      <FilterModal
        filter={internalFilter}
        showVisibilityFilter={showVisibilityFilter}
        open={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilter}
      />
    </>
  )
}

export default QuizTableFilter
