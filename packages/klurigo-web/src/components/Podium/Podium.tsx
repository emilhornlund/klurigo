import type { CSSProperties, FC } from 'react'
import { useState } from 'react'

import { classNames } from '../../utils/helpers'
import Confetti, { getCelebrationLevel } from '../Confetti'
import NicknameChip from '../NicknameChip'
import ScoreChip from '../ScoreChip'

import styles from './Podium.module.scss'

export interface PodiumValue {
  position: number
  nickname?: string
  score?: number
}

export interface PodiumProps {
  values: PodiumValue[]
}

interface StackProps extends PodiumValue {
  animationIndex: number
  onReveal?: () => void
}

const getPositionClassNames = (position: number): string | undefined => {
  let additional: string | undefined = undefined
  if (position > 0 && position < 4) {
    additional = styles[`position-${position}`]
  }
  return classNames(styles.position, additional)
}

const Stack: FC<StackProps> = ({
  position,
  nickname,
  score,
  animationIndex,
  onReveal,
}) => (
  <div
    className={styles.column}
    data-testid="podium-column"
    data-occupied={!!nickname}
    style={{ '--position-index': animationIndex } as CSSProperties}>
    {[...Array(position - 1).keys()].map((key) => (
      <div key={key} className={styles.spacer} />
    ))}
    <div
      className={styles.nickname}
      onAnimationEnd={(event) => {
        // Ignore animation events bubbling from the crown or chip.
        if (event.target === event.currentTarget) onReveal?.()
      }}>
      {nickname && <NicknameChip value={nickname} />}
      {position === 1 && nickname && (
        <div className={styles.crown} aria-hidden="true">
          👑
        </div>
      )}
    </div>
    <div className={styles.stackContainer}>
      <div className={classNames(styles.stack)}>
        <div className={getPositionClassNames(position)}>{position}</div>
        {!nickname && (
          <div
            className={styles.disabledOverlay}
            data-testid={`podium-disabled-overlay-${position}`}
          />
        )}

        {score !== undefined && (
          <ScoreChip value={score} color="default" size="small" transparent />
        )}

        {position === 1 && nickname && (
          <div className={styles.sparkleContainer} aria-hidden="true">
            <div
              className={styles.sparkle}
              style={
                {
                  '--sparkle-delay': '0s',
                  '--sparkle-x': `50%`,
                  '--sparkle-y': `50%`,
                } as CSSProperties
              }
            />

            {[...Array(6)].map((_, i) => {
              const x = 15 + i * 14
              const y = 15 + (i % 3) * 10

              return (
                <div
                  key={i}
                  className={styles.sparkle}
                  style={
                    {
                      '--sparkle-delay': `${i * 0.2}s`,
                      '--sparkle-x': `${x}%`,
                      '--sparkle-y': `${y}%`,
                    } as CSSProperties
                  }
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  </div>
)

const Podium: FC<PodiumProps> = ({ values }) => {
  const [winnerRevealed, setWinnerRevealed] = useState(false)
  const celebrationLevel = getCelebrationLevel(1)
  // Preserve the visual 2–1–3 layout, but skip unoccupied reveal beats.
  const revealOrder = [2, 1, 0].filter((index) => values[index]?.nickname)

  return (
    <div className={styles.main}>
      <Stack
        position={2}
        nickname={values?.[1]?.nickname}
        score={values?.[1]?.score}
        animationIndex={Math.max(0, revealOrder.indexOf(1))}
      />
      <Stack
        position={1}
        nickname={values?.[0]?.nickname}
        score={values?.[0]?.score}
        animationIndex={Math.max(0, revealOrder.indexOf(0))}
        onReveal={() => setWinnerRevealed(true)}
      />
      <Stack
        position={3}
        nickname={values?.[2]?.nickname}
        score={values?.[2]?.score}
        animationIndex={Math.max(0, revealOrder.indexOf(2))}
      />
      {values[0]?.nickname && celebrationLevel !== 'none' && (
        <div className={styles.celebration} aria-hidden="true">
          <Confetti trigger={winnerRevealed} intensity={celebrationLevel} />
        </div>
      )}
    </div>
  )
}

export default Podium
