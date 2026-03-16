import type { CSSProperties, FC } from 'react'
import { useMemo } from 'react'

import { classNames } from '../../utils/helpers'
import Confetti, { getCelebrationLevel } from '../Confetti'
import NicknameChip from '../NicknameChip'

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
}) => (
  <div
    className={styles.column}
    style={{ '--position-index': animationIndex } as CSSProperties}>
    {[...Array(position - 1).keys()].map((key) => (
      <div key={key} className={styles.spacer} />
    ))}
    <div className={styles.nickname}>
      {nickname && <NicknameChip value={nickname} />}
      {position === 1 && nickname && <div className={styles.crown}>👑</div>}
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

        <div className={styles.score}>{score}</div>
        {position === 1 && (
          <div className={styles.sparkleContainer}>
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
              // eslint-disable-next-line react-hooks/purity
              const x = 10 + Math.random() * 80
              // eslint-disable-next-line react-hooks/purity
              const y = 10 + Math.random() * 30

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
  const celebrationLevel = useMemo(() => {
    const level = getCelebrationLevel(1)
    if (level !== 'none') {
      return level
    }
    return undefined
  }, [])

  return (
    <div className={styles.main}>
      <Stack
        position={2}
        nickname={values?.[1]?.nickname}
        score={values?.[1]?.score}
        animationIndex={1}
      />
      <Stack
        position={1}
        nickname={values?.[0]?.nickname}
        score={values?.[0]?.score}
        animationIndex={2}
      />
      <Stack
        position={3}
        nickname={values?.[2]?.nickname}
        score={values?.[2]?.score}
        animationIndex={0}
      />
      {celebrationLevel && (
        <Confetti trigger={true} intensity={celebrationLevel} />
      )}
    </div>
  )
}

export default Podium
