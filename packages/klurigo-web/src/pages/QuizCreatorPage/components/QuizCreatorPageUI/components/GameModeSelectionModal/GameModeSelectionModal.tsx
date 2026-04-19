import { GameMode } from '@klurigo/common'
import type { FC } from 'react'

import { Modal, Typography } from '../../../../../../components'

import styles from './GameModeSelectionModal.module.scss'

export interface GameModeSelectionModalProps {
  onSelect?: (gameMode: GameMode) => void
}

const GameModeSelectionModal: FC<GameModeSelectionModalProps> = ({
  onSelect,
}) => {
  return (
    <Modal title="Choose Your Game Mode" open>
      <Typography variant="body2" align="left" color="default" noOpacity>
        Choose the game mode for your quiz. Each mode offers a unique way for
        participants to play and enjoy!
      </Typography>
      <div className={styles.gameModeSelectionModalWrapper}>
        <button
          className={styles.classic}
          onClick={() => onSelect?.(GameMode.Classic)}>
          <Typography variant="title4" color="default" noOpacity>
            Classic
          </Typography>
          <Typography variant="control" color="default" noOpacity>
            Create a traditional quiz with a mix of question types, including
            multiple-choice, true/false, range sliders, and typed answers.
          </Typography>
        </button>
        <button
          className={styles.zeroToOneHundred}
          onClick={() => onSelect?.(GameMode.ZeroToOneHundred)}>
          <Typography variant="title4" color="default" noOpacity>
            0-100
          </Typography>
          <Typography variant="control" color="default" noOpacity>
            Design a quiz with slider-based questions, where all answers range
            between 0 and 100.
          </Typography>
        </button>
      </div>
    </Modal>
  )
}

export default GameModeSelectionModal
