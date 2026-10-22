import type { CountdownEvent } from '@klurigo/common'
import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'

import { classNames } from '../../utils/helpers'

import styles from './ProgressBar.module.scss'

export interface ProgressBarProps {
  countdown: CountdownEvent
  disableStyling?: boolean
}

const ProgressBar: FC<ProgressBarProps> = ({
  countdown,
  disableStyling = false,
}) => {
  const [progress, setProgress] = useState<number>(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<{
    key: string
    serverTime: number
    clientToServerOffset: number
    initiatedTime: number
    totalDuration: number
  } | null>(null)
  const progressRef = useRef<number>(1)

  useEffect(() => {
    const serverTime = new Date(countdown.serverTime).getTime()
    const initiatedTime = new Date(countdown.initiatedTime).getTime()
    const expiryTime = new Date(countdown.expiryTime).getTime()

    if ([serverTime, initiatedTime, expiryTime].some((time) => isNaN(time))) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      countdownRef.current = null
      progressRef.current = 0
      setProgress(0)
      return
    }

    const key = `${initiatedTime}:${expiryTime}`
    const existingCountdown = countdownRef.current
    const isNewCountdown = existingCountdown?.key !== key
    const clientNow = Date.now()

    if (isNewCountdown && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Replayed events can carry the same server timestamp. Keep the established
    // offset in that case so replaying an event cannot rewind the local clock.
    const clientToServerOffset =
      !isNewCountdown && existingCountdown.serverTime === serverTime
        ? existingCountdown.clientToServerOffset
        : serverTime - clientNow

    const totalDuration = expiryTime - initiatedTime
    countdownRef.current = {
      key,
      serverTime,
      clientToServerOffset,
      initiatedTime,
      totalDuration,
    }

    const elapsed = serverTime - initiatedTime
    const initialProgress =
      totalDuration > 0
        ? Math.max(Math.min(1 - elapsed / totalDuration, 1), 0)
        : 0

    if (isNewCountdown) {
      progressRef.current = initialProgress
      setProgress(initialProgress)
    } else {
      // Refreshed timestamps (for example after reconnecting) can catch up a
      // countdown, but must never make an already-rendered bar move backwards.
      progressRef.current = Math.min(progressRef.current, initialProgress)
      setProgress(progressRef.current)
    }

    if (totalDuration <= 0 || initialProgress <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const currentCountdown = countdownRef.current
        if (!currentCountdown) return

        const now = Date.now() + currentCountdown.clientToServerOffset
        const nextProgress = Math.max(
          Math.min(
            1 -
              (now - currentCountdown.initiatedTime) /
                currentCountdown.totalDuration,
            1,
          ),
          0,
        )

        progressRef.current = Math.min(progressRef.current, nextProgress)
        setProgress(progressRef.current)

        if (nextProgress <= 0) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
        }
      }, 100)
    }
  }, [countdown.expiryTime, countdown.initiatedTime, countdown.serverTime])

  useEffect(
    () => () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    },
    [],
  )

  const getProgressColorClass = () => {
    const percentage = progress * 100
    if (percentage >= 50) return styles.safe
    if (percentage >= 20) return styles.caution
    if (percentage >= 10) return styles.urgent
    return styles.critical
  }

  const clamped = Math.max(Math.min(1, progress), 0)
  const widthPct = (clamped * 100).toFixed(2)

  return (
    <div className={styles.progressBar}>
      <div
        className={classNames(
          styles.track,
          !disableStyling ? getProgressColorClass() : undefined,
          !disableStyling && progress < 0.1 ? styles.pulse : undefined,
        )}
        style={{
          width: `${widthPct}%`,
          transition:
            'width 0.1s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease',
        }}
      />
    </div>
  )
}

export default ProgressBar
