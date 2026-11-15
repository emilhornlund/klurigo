import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { CrittersAvatarConfigurationV1 } from '@klurigo/common'
import type { FC } from 'react'

import { PlayerAvatar, Typography } from '../../../components'
import GameFooterShell from '../GameFooterShell'

import styles from './PlayerGameFooter.module.scss'

export interface PlayerGameFooterProps {
  currentQuestion: number
  totalQuestions: number
  nickname: string
  /** Accepted self identity resolved by the game event boundary. */
  avatar: CrittersAvatarConfigurationV1
  totalScore?: number
}

const PlayerGameFooter: FC<PlayerGameFooterProps> = ({
  currentQuestion,
  totalQuestions,
  nickname,
  avatar,
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
      <div className={styles.identity}>
        <PlayerAvatar
          avatar={avatar}
          alt=""
          size={36}
          className={styles.avatar}
        />
        <Typography
          variant="body2"
          align="center"
          color="inverse"
          noOpacity
          bold
          truncate>
          {nickname}
        </Typography>
      </div>
    }
    trailing={
      totalScore === undefined ? null : (
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
      )
    }
  />
)

export default PlayerGameFooter
