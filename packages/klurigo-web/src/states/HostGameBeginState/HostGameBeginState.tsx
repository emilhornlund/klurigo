import type { GameBeginHostEvent } from '@klurigo/common'
import type { FC } from 'react'

import MegaphoneIcon from '../../assets/images/megaphone-icon.svg'
import { LoadingSpinner, PageProminentIcon, Typography } from '../../components'
import { GamePage } from '../common'

export interface HostGameBeginStateProps {
  event: GameBeginHostEvent
}

const HostGameBeginState: FC<HostGameBeginStateProps> = () => (
  <GamePage>
    <PageProminentIcon src={MegaphoneIcon} alt="Megaphone" />
    <Typography variant="title" width="medium" align="center" color="inverse">
      Loading Game
    </Typography>
    <Typography variant="body" width="small" align="center" color="inverse">
      The game starts any second
    </Typography>
    <LoadingSpinner />
  </GamePage>
)

export default HostGameBeginState
