import { type CSSProperties, type FC } from 'react'
import { useEffect, useState } from 'react'

import colors from '../../styles/colors.tokens.module.scss'

import styles from './Confetti.module.scss'

export type ConfettiIntensity = 'normal' | 'major' | 'epic'

export interface ConfettiProps {
  trigger: boolean
  intensity: ConfettiIntensity
  onAnimationEnd?: () => void
}

interface ConfettiParticle {
  id: number
  color: string
  x: number
  delay: number
  duration: number
  size: number
}

const particleCounts = {
  normal: 25,
  major: 45,
  epic: 70,
}

const colorPalettes = {
  normal: [
    colors.colorCelebrationConfettiSuccess,
    colors.colorCelebrationConfettiAccent,
  ],
  major: [
    colors.colorCelebrationConfettiSuccess,
    colors.colorCelebrationConfettiAccent,
    colors.colorCelebrationConfettiRankGold,
  ],
  epic: [
    colors.colorCelebrationConfettiSuccess,
    colors.colorCelebrationConfettiAccent,
    colors.colorCelebrationConfettiRankGold,
    colors.colorCelebrationConfettiAlt,
    colors.colorCelebrationConfettiInfo,
  ],
}

const generateParticles = (
  intensity: ConfettiIntensity,
): ConfettiParticle[] => {
  const count = particleCounts[intensity]
  const colors = colorPalettes[intensity]

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.random(),
    delay: Math.random(),
    duration: Math.random(),
    size: Math.random() * 8 + 4, // 4-12px
  }))
}

const Confetti: FC<ConfettiProps> = ({
  trigger,
  intensity,
  onAnimationEnd,
}) => {
  const [particles, setParticles] = useState<ConfettiParticle[]>([])

  useEffect(() => {
    if (trigger) {
      const newParticles = generateParticles(intensity)
      setParticles(newParticles)

      // Auto-cleanup after animation completes (2.5s + buffer)
      const timer = setTimeout(() => {
        setParticles([])
        onAnimationEnd?.()
      }, 2800)

      return () => clearTimeout(timer)
    }
  }, [trigger, intensity, onAnimationEnd])

  if (!trigger || particles.length === 0) {
    return null
  }

  return (
    <div
      className={styles.confettiContainer}
      data-testid="confetti"
      data-trigger={trigger}
      data-intensity={intensity}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={styles.confettiParticle}
          style={
            {
              '--random-x': particle.x,
              '--random-delay': particle.delay,
              '--random-duration': particle.duration,
              '--particle-color': particle.color,
              '--particle-size': `${particle.size}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

export default Confetti
