import type {
  GameResultClassicModePlayerMetricDto,
  GameResultDto,
  GameResultZeroToOneHundredModePlayerMetricDto,
} from '@klurigo/common'
import { GameMode } from '@klurigo/common'
import type { FC } from 'react'
import { useMemo } from 'react'

import {
  buildPlayerSectionMetricDetails,
  getAveragePrecision,
  getCorrectPercentage,
} from '../../utils'
import { GameResultTable, type TableItem } from '../components'

function getProgress(
  mode: GameMode,
  metric: GameResultDto['playerMetrics'][0],
): number {
  if (mode === GameMode.Classic) {
    return getCorrectPercentage(metric as GameResultClassicModePlayerMetricDto)
  }
  if (mode === GameMode.ZeroToOneHundred) {
    return getAveragePrecision(
      metric as GameResultZeroToOneHundredModePlayerMetricDto,
    )
  }
  return 0
}

export interface PlayerSectionProps {
  mode: GameMode
  playerMetrics: GameResultDto['playerMetrics']
  currentParticipantId: string
}

const PlayerSection: FC<PlayerSectionProps> = ({
  mode,
  playerMetrics,
  currentParticipantId,
}) => {
  const items = useMemo<TableItem[]>(
    () =>
      playerMetrics?.map((metric) => ({
        type: 'table-row' as const,
        badge: metric.rank,
        value: metric.player.nickname,
        label: metric.player.id === currentParticipantId ? 'You' : undefined,
        progress: getProgress(mode, metric),
        details: buildPlayerSectionMetricDetails(mode, metric),
      })) ?? [],
    [playerMetrics, currentParticipantId, mode],
  )

  return (
    <section>
      <GameResultTable items={items} />
    </section>
  )
}

export default PlayerSection
