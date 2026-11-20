import type {
  GameMode,
  LanguageCode,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import type { FC } from 'react'

import FilterModal from './components/FilterModal'
import SearchFilterBar from './SearchFilterBar'

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
}) => (
  <SearchFilterBar
    filter={filter}
    searchLabel="Search quizzes"
    onChange={onChange}
    renderModal={(props) => (
      <FilterModal {...props} showVisibilityFilter={showVisibilityFilter} />
    )}
  />
)

export default QuizTableFilter
