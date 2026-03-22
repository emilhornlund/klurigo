import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { classNames } from '../../utils/helpers'

import styles from './HorizontalRail.module.scss'

/**
 * Props for the HorizontalRail component.
 */
export type HorizontalRailProps = {
  /** Rail items to render in the horizontally scrollable row. */
  children: ReactNode
  /** When true, hides the scrollbar entirely. Default: false (thin scrollbar). */
  hideScrollbar?: boolean
  /** Optional additional className applied to the wrapper element. */
  className?: string
}

/**
 * A generic horizontally scrollable rail container.
 *
 * Renders its children in a `flex`/`overflow-x: auto` scroll container with
 * CSS scroll-snap. On desktop, left/right arrow buttons appear on hover to
 * page through the rail; arrows are only shown when there is content to scroll
 * in that direction. On mobile, touch scrolling is used instead.
 *
 * Scroll state (`canScrollLeft` / `canScrollRight`) is tracked internally via
 * a scroll listener and a `ResizeObserver` so that arrows reflect the current
 * position at all times.
 */
const HorizontalRail: FC<HorizontalRailProps> = ({
  children,
  hideScrollbar = false,
  className,
}) => {
  const railRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = railRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      observer.disconnect()
    }
  }, [updateScrollState, children])

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = railRef.current
    if (!el) return
    el.scrollBy({
      left: direction === 'left' ? -el.clientWidth : el.clientWidth,
      behavior: 'smooth',
    })
  }, [])

  const wrapperClass = classNames(
    styles.railWrapper,
    canScrollLeft ? styles.hasScrollLeft : undefined,
    canScrollRight ? styles.hasScrollRight : undefined,
    hideScrollbar ? styles.hideScrollbar : undefined,
    className,
  )

  return (
    <div className={wrapperClass} data-testid="horizontal-rail">
      <button
        className={classNames(styles.arrowButton, styles.arrowPrev)}
        onClick={() => scroll('left')}
        aria-label="Scroll left"
        tabIndex={-1}
        data-testid="rail-arrow-prev">
        <FontAwesomeIcon icon={faChevronLeft} />
      </button>
      <div
        className={styles.rail}
        ref={railRef}
        data-testid="horizontal-rail-scroll">
        {children}
      </div>
      <button
        className={classNames(styles.arrowButton, styles.arrowNext)}
        onClick={() => scroll('right')}
        aria-label="Scroll right"
        tabIndex={-1}
        data-testid="rail-arrow-next">
        <FontAwesomeIcon icon={faChevronRight} />
      </button>
    </div>
  )
}

export default HorizontalRail
