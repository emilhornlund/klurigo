import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC } from 'react'

import { Typography } from '../../../components'

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
  <div className={styles.main}>
    <div className={styles.questions}>
      <FontAwesomeIcon icon={faCircleQuestion} className={styles.icon} />
      <Typography variant="body2" color="inverse" noOpacity bold>
        {currentQuestion} / {totalQuestions}
      </Typography>
    </div>
    <div className={styles.nickname}>
      <Typography variant="body2" align="center" color="inverse" noOpacity bold>
        {nickname}
      </Typography>
    </div>
    <div className={styles.score}>
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
    </div>
  </div>
)

export default PlayerGameFooter
