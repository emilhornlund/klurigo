import type { GameBeginPlayerEvent } from '@klurigo/common'
import type { FC } from 'react'

import BellRingIcon from '../../assets/images/bell-ring-icon.svg'
import {
  LoadingSpinner,
  NicknameChip,
  PageProminentIcon,
  Typography,
} from '../../components'
import { GamePage } from '../common'

export interface PlayerGameBeginStateProps {
  event: GameBeginPlayerEvent
}

const PlayerGameBeginState: FC<PlayerGameBeginStateProps> = ({
  event: {
    player: { nickname },
  },
}) => (
  <GamePage>
    <PageProminentIcon src={BellRingIcon} alt="BellRing" />
    <NicknameChip value={nickname} />
    <Typography variant="title" width="medium">
      Get ready!
    </Typography>
    <Typography variant="text" width="small">
      The game starts any second
    </Typography>
    <LoadingSpinner />
  </GamePage>
)

export default PlayerGameBeginState
