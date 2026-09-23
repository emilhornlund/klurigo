import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'

import { Typography } from '../../../components'
import GameFooterShell from '../GameFooterShell'

import styles from './PlayerGameFooter.module.scss'

export interface PlayerGameFooterProps {
  currentQuestion: number
  totalQuestions: number
  nickname: string
  totalScore: number
}

const PlayerGameFooter: FC<PlayerGameFooterProps> = ({
  currentQuestion,
  totalQuestions,
  nickname,
  totalScore,
}) => (
  <GameFooterShell
    leading={
      <>
        <FontAwesomeIcon icon={faCircleQuestion} />
        <Typography variant="body2" color="inverse" noOpacity bold>
          {currentQuestion} / {totalQuestions}
        </Typography>
      </>
    }
    center={
      <Typography variant="body2" align="center" color="inverse" noOpacity bold>
        {nickname}
      </Typography>
    }
    trailing={
      <span>
        <Typography
          variant="body2"
          align="right"
          className={styles.badge}
          noOpacity
          bold>
          {totalScore}
        </Typography>
      </span>
    }
  />
)

export default PlayerGameFooter
