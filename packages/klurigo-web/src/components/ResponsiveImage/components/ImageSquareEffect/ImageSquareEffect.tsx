import type { CountdownEvent } from '@klurigo/common'
import { QuestionImageRevealEffectType } from '@klurigo/common'
import type { FC } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { classNames } from '../../../../utils/helpers'

import styles from './ImageSquareEffect.module.scss'

export type ImageSquareEffectProps = {
  countdown?: CountdownEvent
  effect:
    | QuestionImageRevealEffectType.Square3x3
    | QuestionImageRevealEffectType.Square5x5
    | QuestionImageRevealEffectType.Square8x8
}

const ImageSquareEffect: FC<ImageSquareEffectProps> = ({
  countdown,
  effect,
}) => {
  const n = useMemo(() => {
    switch (effect) {
      case QuestionImageRevealEffectType.Square3x3:
        return 3
      case QuestionImageRevealEffectType.Square5x5:
        return 5
      case QuestionImageRevealEffectType.Square8x8:
        return 8
    }
  }, [effect])

  const totalSquares = useMemo(() => n * n, [n])

  const seed = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    if (!countdown) return Date.now()
    const initiated = new Date(countdown.initiatedTime).getTime()
    // eslint-disable-next-line react-hooks/purity
    return Number.isFinite(initiated) ? initiated : Date.now()
  }, [countdown])

  const random = (value: number): number => {
    let t = value >>> 0 || 1

    t += 0x6d2b79f5

    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)

    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }

  const { rank } = useMemo(() => {
    const arr = Array.from({ length: totalSquares }, (_, i) => i)

    arr.sort((a, b) => random(seed + a) - random(seed + b))

    const rnk = new Array<number>(totalSquares)

    for (let pos = 0; pos < totalSquares; pos++) {
      rnk[arr[pos]] = pos
    }

    return { rank: rnk }
  }, [seed, totalSquares])

  const [coveredCount, setCoveredCount] = useState(totalSquares)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setCoveredCount(totalSquares)
  }, [totalSquares, seed])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (!countdown) return

    const serverTime = new Date(countdown.serverTime).getTime()
    const initiated = new Date(countdown.initiatedTime).getTime()
    const expiry = new Date(countdown.expiryTime).getTime()

    if ([serverTime, initiated, expiry].some((t) => isNaN(t))) {
      setCoveredCount(0)
      return
    }

    const clientToServerOffset = serverTime - Date.now()
    const totalDuration = expiry - initiated
    if (totalDuration <= 0) {
      setCoveredCount(0)
      return
    }

    const tick = () => {
      const now = Date.now() + clientToServerOffset
      const elapsed = now - initiated
      const progress = Math.min(elapsed / totalDuration, 1)

      const removed = Math.floor(progress * totalSquares)
      setCoveredCount(Math.max(totalSquares - removed, 0))
    }

    tick()
    intervalRef.current = setInterval(tick, 200)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [countdown, totalSquares])

  return (
    <div
      className={styles.imageSquareEffect}
      style={{
        gridTemplateColumns: `repeat(${n}, 1fr)`,
        gridTemplateRows: `repeat(${n}, 1fr)`,
      }}>
      {Array.from({ length: totalSquares }).map((_, index) => {
        const isCovered = rank[index] < coveredCount
        return (
          <div
            key={index}
            className={classNames(
              styles.tile,
              !isCovered ? styles.revealed : undefined,
            )}
          />
        )
      })}
    </div>
  )
}

export default ImageSquareEffect
