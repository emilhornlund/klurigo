import { GameMode } from '@klurigo/common'
import type { FC } from 'react'

import { Button, Modal, Typography } from '../../../../../../components'

import styles from './GameModeSelectionModal.module.scss'

export interface GameModeSelectionModalProps {
  onSelect?: (gameMode: GameMode) => void
}

const GameModeSelectionModal: FC<GameModeSelectionModalProps> = ({
  onSelect,
}) => {
  return (
    <Modal title="Choose Your Game Mode" open>
      <Typography variant="body2" noOpacity>
        Choose the game mode for your quiz. Each mode offers a unique way for
        participants to play and enjoy!
      </Typography>
      <div className={styles.gameModeSelectionModalWrapper}>
        <Button
          id="game-mode-classic-button"
          type="button"
          surface="light"
          onClick={() => onSelect?.(GameMode.Classic)}>
          <div className={styles.buttonContent}>
            <Typography
              variant="title4"
              align="center"
              className={styles.buttonText}
              noOpacity>
              Classic
            </Typography>
            <Typography
              variant="control"
              align="center"
              className={styles.buttonText}
              noOpacity>
              Create a traditional quiz with a mix of question types, including
              multiple-choice, true/false, range sliders, and typed answers.
            </Typography>
          </div>
        </Button>
        <Button
          id="game-mode-zero-to-one-hundred-button"
          type="button"
          surface="light"
          onClick={() => onSelect?.(GameMode.ZeroToOneHundred)}>
          <div className={styles.buttonContent}>
            <Typography
              variant="title4"
              align="center"
              className={styles.buttonText}
              noOpacity>
              0-100
            </Typography>
            <Typography
              variant="control"
              align="center"
              className={styles.buttonText}
              noOpacity>
              Design a quiz with slider-based questions, where all answers range
              between 0 and 100.
            </Typography>
          </div>
        </Button>
      </div>
    </Modal>
  )
}

export default GameModeSelectionModal
