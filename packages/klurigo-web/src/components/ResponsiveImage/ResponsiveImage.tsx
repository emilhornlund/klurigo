import { faLinkSlash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { CountdownEvent } from '@klurigo/common'
import { QuestionImageRevealEffectType } from '@klurigo/common'
import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useDebounceCallback, useResizeObserver } from 'usehooks-ts'

import { classNames } from '../../utils/helpers'
import LoadingSpinner from '../LoadingSpinner'

import { ImageSquareEffect } from './components'
import { useImageBlurEffect } from './hook'
import styles from './ResponsiveImage.module.scss'

export type RevealEffect = {
  type: QuestionImageRevealEffectType
  countdown?: CountdownEvent
}

export type ResponsiveImageProps = {
  imageURL?: string
  alt?: string
  revealEffect?: RevealEffect
  noBorder?: boolean
  noCornerRadius?: boolean
  borderColor?: string
  fit?: 'contain' | 'fill' | 'width'
  children?: ReactNode | ReactNode[]
}

type Phase = 'idle' | 'loading' | 'ready' | 'error'
type Size = { width?: number; height?: number }

const ResponsiveImage: FC<ResponsiveImageProps> = ({
  imageURL,
  alt,
  noBorder = false,
  noCornerRadius = false,
  borderColor,
  fit = 'contain',
  revealEffect,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null)

  const [containerSize, setContainerSize] = useState<Size>({
    width: 0,
    height: 0,
  })
  const [intrinsic, setIntrinsic] = useState({ w: 0, h: 0 })
  const [phase, setPhase] = useState<Phase>('idle')
  const [displaySrc, setDisplaySrc] = useState<string | null>(null)

  const applyContainerSize = useCallback((next: Size) => {
    setContainerSize((prev) => {
      const w = Math.round(next.width ?? 0)
      const h = Math.round(next.height ?? 0)
      if ((prev.width ?? 0) === w && (prev.height ?? 0) === h) return prev
      return { width: w, height: h }
    })
  }, [])

  const onResize = useDebounceCallback(applyContainerSize, 80)

  useResizeObserver<HTMLDivElement>({
    // @ts-expect-error (usehooks-ts React 19 types mismatch)
    ref,
    onResize,
    box: 'content-box',
  })

  useEffect(() => {
    if (!imageURL) {
      setPhase('idle')
      setDisplaySrc(null)
      setIntrinsic({ w: 0, h: 0 })
      return
    }

    setPhase('loading')
    setDisplaySrc(null)
    setIntrinsic({ w: 0, h: 0 })

    const img = new Image()
    img.onload = () => {
      setIntrinsic({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 })
      setDisplaySrc(imageURL)
      setPhase('ready')
    }
    img.onerror = () => {
      setDisplaySrc(null)
      setIntrinsic({ w: 0, h: 0 })
      setPhase('error')
    }
    img.src = imageURL

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [imageURL])

  const box = useMemo<{ w: number; h: number } | undefined>(() => {
    if (phase !== 'ready' || !intrinsic.w || !intrinsic.h) return undefined

    const cw = containerSize.width ?? 0
    const ch = containerSize.height ?? 0
    if (cw <= 0 && ch <= 0) return undefined

    const { w: iw, h: ih } = intrinsic

    let s: number | undefined

    if (fit === 'fill') {
      return { w: Math.max(1, cw), h: Math.max(1, ch) }
    } else if (fit === 'width') {
      // Full width = derive size from width (fallback to height if width is unknown)
      if (cw > 0) s = cw / iw
      else if (ch > 0) s = ch / ih
    } else {
      // "Contain" behavior (fit inside available box)
      const rw = cw > 0 ? cw / iw : Number.POSITIVE_INFINITY
      const rh = ch > 0 ? ch / ih : Number.POSITIVE_INFINITY
      s = Math.min(rw, rh)
    }

    if (!s || !Number.isFinite(s) || s <= 0) return undefined

    const w = Math.max(1, Math.round(iw * s))
    const h = Math.max(1, Math.round(ih * s))
    return { w, h }
  }, [phase, containerSize, intrinsic, fit])

  const blurStyle = useImageBlurEffect(box, revealEffect?.countdown, {
    endAt: 0.25,
  })

  const iconSize = Math.max(
    16,
    Math.round(
      Math.min(containerSize.width ?? 0, containerSize.height ?? 0) * 0.15,
    ),
  )

  const shouldUseFallbackAspectRatio = phase === 'loading' || phase === 'error'

  return (
    <div
      ref={ref}
      className={classNames(
        styles.container,
        shouldUseFallbackAspectRatio ? styles.fallbackAspectRatio : undefined,
      )}>
      {phase === 'ready' && displaySrc && box && (
        <div
          className={classNames(
            noBorder ? styles.boxNoBorder : styles.box,
            noCornerRadius ? styles.noRadius : undefined,
          )}
          style={{
            ...(fit === 'fill'
              ? { width: '100%', height: '100%' }
              : fit === 'width'
                ? { width: '100%', height: box.h }
                : { width: box.w, height: box.h }),
            ...(borderColor ? { borderColor } : undefined),
          }}>
          {(revealEffect?.type === QuestionImageRevealEffectType.Square3x3 ||
            revealEffect?.type === QuestionImageRevealEffectType.Square5x5 ||
            revealEffect?.type === QuestionImageRevealEffectType.Square8x8) && (
            <ImageSquareEffect
              countdown={revealEffect.countdown}
              effect={revealEffect.type}
            />
          )}
          <img
            src={displaySrc}
            alt={alt ?? ''}
            className={styles.img}
            style={
              revealEffect?.type === QuestionImageRevealEffectType.Blur
                ? blurStyle
                : undefined
            }
          />
          {children && <div className={styles.overlay}>{children}</div>}
        </div>
      )}

      {(phase === 'loading' || phase === 'error') && (
        <div
          className={classNames(
            styles.centerOverlay,
            noBorder ? styles.boxNoBorder : styles.box,
            noCornerRadius ? styles.noRadius : undefined,
          )}
          style={{
            ...(borderColor ? { borderColor } : undefined),
            ...(shouldUseFallbackAspectRatio
              ? {
                  width: '100%',
                  aspectRatio: String(16 / 10),
                }
              : undefined),
          }}>
          {phase === 'loading' ? (
            <LoadingSpinner />
          ) : (
            <FontAwesomeIcon
              icon={faLinkSlash}
              className={styles.icon}
              style={{ fontSize: iconSize }}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default ResponsiveImage
