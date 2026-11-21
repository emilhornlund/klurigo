import { GameMode, GameParticipantType, GameStatus } from '@klurigo/common'
import type { FC } from 'react'
import { useEffect, useState } from 'react'

import type { GameHistorySearchOptions } from '../../../../api/resources/game.resource'
import FilterDialog, {
  FilterDialogBody,
} from '../../../../components/QuizTableFilter/components/FilterModal/FilterDialog'
import styles from '../../../../components/QuizTableFilter/components/FilterModal/FilterModal.module.scss'
import SearchFilterBar from '../../../../components/QuizTableFilter/SearchFilterBar'
import Select from '../../../../components/Select'
import Typography from '../../../../components/Typography'
import { GameModeLabels } from '../../../../models'
import { defaultGameHistorySort } from '../../useGameHistorySearchOptions'

type GameHistoryFilterProps = {
  filter: GameHistorySearchOptions
  onChange: (options: GameHistorySearchOptions) => void
}

type ModalOptions = Omit<GameHistorySearchOptions, 'search'>

type GameHistoryFilterDialogProps = {
  filter: ModalOptions
  open: boolean
  onClose: () => void
  onApply: (options: ModalOptions) => void
}

const all = ['all', 'All'] as const

const GameHistoryFilterDialog: FC<GameHistoryFilterDialogProps> = ({
  filter,
  open,
  onClose,
  onApply,
}) => {
  const [draft, setDraft] = useState<ModalOptions>(filter)

  useEffect(() => {
    setDraft(filter)
  }, [filter])

  const renderSelect = <K extends keyof ModalOptions>(
    key: K,
    id: string,
    label: string,
    choices: readonly (readonly [
      NonNullable<ModalOptions[K]> | 'all',
      string,
    ])[],
    fallback: string,
  ) => (
    <div className={styles.row}>
      <label htmlFor={id}>
        <Typography variant="control" noOpacity bold>
          {label}
        </Typography>
      </label>
      <Select
        id={id}
        surface="light"
        values={choices.map(([value, valueLabel]) => ({
          key: value,
          value,
          valueLabel,
        }))}
        value={draft[key] ?? fallback}
        onChange={(value) => {
          const selected = choices.find(([option]) => option === value)?.[0]
          setDraft({
            ...draft,
            [key]: selected === 'all' ? undefined : selected,
          })
        }}
      />
    </div>
  )

  return (
    <FilterDialog
      title="Refine Your Game Search"
      open={open}
      onClose={onClose}
      onApply={() => onApply(draft)}>
      <FilterDialogBody description="Narrow down your search to find games in your history.">
        {renderSelect(
          'participantType',
          'participation-select',
          'Participation',
          [
            all,
            [GameParticipantType.HOST, 'Hosted'],
            [GameParticipantType.PLAYER, 'Played'],
          ],
          'all',
        )}
        {renderSelect(
          'mode',
          'game-mode-select',
          'Game Mode',
          [
            all,
            ...Object.values(GameMode).map(
              (mode) => [mode, GameModeLabels[mode]] as const,
            ),
          ],
          'all',
        )}
        {renderSelect(
          'status',
          'status-select',
          'Status',
          [
            all,
            [GameStatus.Active, 'Ongoing'],
            [GameStatus.Completed, 'Completed'],
          ],
          'all',
        )}
        {renderSelect(
          'sort',
          'sort-by-select',
          'Sort By',
          [
            ['name', 'Name'],
            ['created', 'Created'],
            ['updated', 'Updated'],
          ],
          defaultGameHistorySort.sort,
        )}
        {renderSelect(
          'order',
          'sort-order-select',
          'Sort Order',
          [
            ['asc', 'Ascending'],
            ['desc', 'Descending'],
          ],
          defaultGameHistorySort.order,
        )}
      </FilterDialogBody>
    </FilterDialog>
  )
}

const GameHistoryFilter: FC<GameHistoryFilterProps> = ({
  filter,
  onChange,
}) => (
  <SearchFilterBar
    filter={filter}
    searchLabel="Search games"
    onChange={onChange}
    renderModal={(props) => <GameHistoryFilterDialog {...props} />}
  />
)

export default GameHistoryFilter
