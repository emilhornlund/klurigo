import {
  GameMode,
  LanguageCode,
  QuizCategory,
  QuizVisibility,
} from '@klurigo/common'
import type { FC } from 'react'
import { useEffect, useState } from 'react'

import {
  GameModeLabels,
  LanguageLabels,
  QuizCategoryLabels,
  QuizVisibilityLabels,
} from '../../../../models'
import { classNames } from '../../../../utils/helpers'
import Button from '../../../Button'
import Modal from '../../../Modal'
import Select from '../../../Select'
import Typography from '../../../Typography'

import styles from './FilterModal.module.scss'

const ALL_KEY = 'all'
const ALL_VALUE = 'All'

export interface FilterOptions {
  visibility?: QuizVisibility
  category?: QuizCategory
  languageCode?: LanguageCode
  mode?: GameMode
  sort?: 'title' | 'created' | 'updated'
  order?: 'asc' | 'desc'
}

export interface FilterModalProps {
  filter: FilterOptions
  showVisibilityFilter: boolean
  open: boolean
  onClose: () => void
  onApply: (options: FilterOptions) => void
}

const FilterModal: FC<FilterModalProps> = ({
  filter,
  showVisibilityFilter,
  open,
  onClose,
  onApply,
}) => {
  const [internalFilterOptions, setInternalFilterOptions] =
    useState<FilterOptions>(filter)

  useEffect(() => {
    setInternalFilterOptions(filter)
  }, [filter])

  const handleFilterOptionChange = <K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K],
  ): void => {
    setInternalFilterOptions((oldFilterOptions) => ({
      ...oldFilterOptions,
      [key]: value,
    }))
  }

  const handleApplyFilter = () => {
    onApply(internalFilterOptions)
  }

  return (
    <Modal title="Refine Your Quiz Search" open={open}>
      <div className={styles.filterModalContainer}>
        <Typography variant="body2" align="left" color="default" noOpacity>
          Narrow down your search and find the perfect quiz!
        </Typography>
        <div className={styles.row}>
          <Typography
            variant="control"
            align="left"
            color="default"
            noOpacity
            bold>
            Category
          </Typography>
          <Select
            id="category-select"
            kind="secondary"
            values={[
              { key: ALL_KEY, value: ALL_KEY, valueLabel: ALL_VALUE },
              ...Object.values(QuizCategory).map((category) => ({
                key: category,
                value: category,
                valueLabel: QuizCategoryLabels[category],
              })),
            ]}
            value={internalFilterOptions.category || ALL_KEY}
            onChange={(value) =>
              handleFilterOptionChange(
                'category',
                value === ALL_KEY ? undefined : (value as QuizCategory),
              )
            }
          />
        </div>
        {showVisibilityFilter && (
          <div className={styles.row}>
            <Typography
              variant="control"
              align="left"
              color="default"
              noOpacity
              bold>
              Visibility
            </Typography>
            <Select
              id="visibility-select"
              kind="secondary"
              values={[
                { key: ALL_KEY, value: ALL_KEY, valueLabel: ALL_VALUE },
                ...Object.values(QuizVisibility).map((visibility) => ({
                  key: visibility,
                  value: visibility,
                  valueLabel: QuizVisibilityLabels[visibility],
                })),
              ]}
              value={internalFilterOptions.visibility || ALL_KEY}
              onChange={(value) =>
                handleFilterOptionChange(
                  'visibility',
                  value === ALL_KEY ? undefined : (value as QuizVisibility),
                )
              }
            />
          </div>
        )}
        <div className={styles.row}>
          <Typography
            variant="control"
            align="left"
            color="default"
            noOpacity
            bold>
            Language
          </Typography>
          <Select
            id="language-select"
            kind="secondary"
            values={[
              { key: ALL_KEY, value: ALL_KEY, valueLabel: ALL_VALUE },
              ...Object.values(LanguageCode).map((languageCode) => ({
                key: languageCode,
                value: languageCode,
                valueLabel: LanguageLabels[languageCode],
              })),
            ]}
            value={internalFilterOptions.languageCode || ALL_KEY}
            onChange={(value) =>
              handleFilterOptionChange(
                'languageCode',
                value === ALL_KEY ? undefined : (value as LanguageCode),
              )
            }
          />
        </div>
        <div className={styles.row}>
          <Typography
            variant="control"
            align="left"
            color="default"
            noOpacity
            bold>
            Game Mode
          </Typography>
          <Select
            id="game-mode-select"
            kind="secondary"
            values={[
              { key: ALL_KEY, value: ALL_KEY, valueLabel: ALL_VALUE },
              ...Object.values(GameMode).map((gameMode) => ({
                key: gameMode,
                value: gameMode,
                valueLabel: GameModeLabels[gameMode],
              })),
            ]}
            value={internalFilterOptions.mode || ALL_KEY}
            onChange={(value) =>
              handleFilterOptionChange(
                'mode',
                value === ALL_KEY ? undefined : (value as GameMode),
              )
            }
          />
        </div>
        <div className={styles.row}>
          <Typography
            variant="control"
            align="left"
            color="default"
            noOpacity
            bold>
            Sort By
          </Typography>
          <Select
            id="sort-by-select"
            kind="secondary"
            values={[
              { key: 'title', value: 'title', valueLabel: 'Title' },
              { key: 'created', value: 'created', valueLabel: 'Created' },
              { key: 'updated', value: 'updated', valueLabel: 'Updated' },
            ]}
            value={internalFilterOptions.sort || 'created'}
            onChange={(value) =>
              handleFilterOptionChange(
                'sort',
                value as 'title' | 'created' | 'updated',
              )
            }
          />
        </div>
        <div className={styles.row}>
          <Typography
            variant="control"
            align="left"
            color="default"
            noOpacity
            bold>
            Sort Order
          </Typography>
          <Select
            id="sort-order-select"
            kind="secondary"
            values={[
              { key: 'asc', value: 'asc', valueLabel: 'Ascending' },
              { key: 'desc', value: 'desc', valueLabel: 'Descending' },
            ]}
            value={internalFilterOptions.order || 'desc'}
            onChange={(value) =>
              handleFilterOptionChange('order', value as 'asc' | 'desc')
            }
          />
        </div>
        <div className={classNames(styles.row, styles.buttonGroup)}>
          <Button
            id="close-button"
            type="button"
            kind="secondary"
            value="Close"
            onClick={onClose}
          />
          <Button
            id="apply-button"
            type="button"
            kind="call-to-action"
            value="Apply"
            onClick={handleApplyFilter}
          />
        </div>
      </div>
    </Modal>
  )
}

export default FilterModal
