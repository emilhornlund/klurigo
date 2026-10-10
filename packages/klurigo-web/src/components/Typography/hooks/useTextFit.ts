import { useEffect, useLayoutEffect, useState } from 'react'

import type { TypographyVariant } from '../Typography'

/**
 * Minimum font size threshold in pixels.
 * Text will shrink down to this size, then stop (showing ellipsis if needed).
 */
const MIN_FONT_SIZE = 12

/**
 * Minimum line-height ratio relative to font-size.
 * Line-height must be at least 1.1x the font-size to prevent text clipping.
 */
const MIN_LINE_HEIGHT_RATIO = 1.1

/**
 * Step size in pixels for monotonic font-size reduction.
 * Smaller values = more precise but slower.
 */
const STEP_SIZE = 0.5

/**
 * Breakpoint type derived from media queries.
 */
type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/**
 * Detects the current device breakpoint based on window width.
 * Must match SCSS breakpoints in helpers.scss.
 */
function getCurrentBreakpoint(): Breakpoint | null {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return null
  }

  // Tablet: min-width 768px and max-width 1023px
  if (window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches) {
    return 'tablet'
  }

  // Desktop: min-width 1024px
  if (window.matchMedia('(min-width: 1024px)').matches) {
    return 'desktop'
  }

  // Mobile: max-width 767px (default)
  return 'mobile'
}

/**
 * Map to cache the original SCSS font size for each element.
 * Key: element reference, Value: max font size in pixels.
 * This prevents reading the fitted font size instead of the original.
 */
const maxFontSizeCache = new WeakMap<HTMLElement, number>()
const maxLineHeightRatioCache = new WeakMap<HTMLElement, number>()

/**
 * Extracts the current font-size from an element's computed styles.
 * This represents the maximum font-size from variant SCSS.
 *
 * Uses a cache to store the FIRST read value (before any fitting is applied).
 * This prevents the infinite loop caused by reading the fitted size.
 */
function getMaxFontSizeFromElement(element: HTMLElement): number {
  // Check cache first
  const cached = maxFontSizeCache.get(element)
  if (cached !== undefined) {
    return cached
  }

  // First read - this should be the original SCSS value
  const computed = getComputedStyle(element)
  const maxFontSize = parseFloat(computed.fontSize)

  // Cache it for future reads
  maxFontSizeCache.set(element, maxFontSize)

  return maxFontSize
}

function getMaxLineHeightRatioFromElement(
  element: HTMLElement,
  maxFontSize: number,
): number {
  const cached = maxLineHeightRatioCache.get(element)
  if (cached !== undefined) {
    return cached
  }

  const lineHeight = parseLineHeight(
    getComputedStyle(element).lineHeight,
    maxFontSize,
  )
  let ratio = lineHeight / maxFontSize
  if (
    !isFinite(ratio) ||
    ratio <= 0 ||
    ratio < MIN_LINE_HEIGHT_RATIO ||
    ratio > 3
  ) {
    console.warn(
      `Invalid or unsafe line-height ratio ${ratio}, using safe default 1.2`,
    )
    ratio = 1.2
  }

  maxLineHeightRatioCache.set(element, ratio)
  return ratio
}

/**
 * Parses computed line-height to absolute pixels.
 * Handles unitless (multiplier), px, rem, and normal values.
 */
function parseLineHeight(lineHeight: string, fontSize: number): number {
  if (lineHeight === 'normal') {
    // Browser default: ~1.2
    return fontSize * 1.2
  }

  // Unitless: multiplier of font-size
  if (/^[\d.]+$/.test(lineHeight)) {
    return fontSize * parseFloat(lineHeight)
  }

  // Pixel value
  if (lineHeight.endsWith('px')) {
    return parseFloat(lineHeight)
  }

  // Rem value: convert to px (1rem = 16px default, but respect root font-size)
  if (lineHeight.endsWith('rem')) {
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    )
    return parseFloat(lineHeight) * rootFontSize
  }

  // Fallback: try parsing as float
  const parsed = parseFloat(lineHeight)
  return isNaN(parsed) ? fontSize * 1.2 : parsed
}

/**
 * Measures the unclamped scroll height of text at a given font size.
 * Creates an offscreen measurer element to avoid polluting the DOM.
 */
function measureTextHeight(
  element: HTMLElement,
  text: string,
  fontSize: number,
  lineHeightRatio: number,
): number {
  const computed = getComputedStyle(element)

  // Create offscreen measurer
  const measurer = document.createElement('div')
  measurer.style.position = 'absolute'
  measurer.style.visibility = 'hidden'
  measurer.style.pointerEvents = 'none'
  measurer.style.left = '-9999px'
  measurer.style.top = '-9999px'

  // Copy critical layout properties
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0) {
    return 0
  }
  measurer.style.width = `${rect.width}px`
  measurer.style.fontFamily = computed.fontFamily
  measurer.style.fontWeight = computed.fontWeight
  measurer.style.letterSpacing = computed.letterSpacing
  measurer.style.wordBreak = computed.wordBreak
  measurer.style.textAlign = computed.textAlign
  measurer.style.whiteSpace = 'normal'
  measurer.style.wordWrap = 'break-word'
  measurer.style.overflowWrap = 'break-word'

  // Apply font size override
  measurer.style.fontSize = `${fontSize}px`

  // Keep line-height proportional as candidate font sizes change.
  measurer.style.lineHeight = `${fontSize * lineHeightRatio}px`

  // Remove any clamp/overflow that would hide true height
  measurer.style.overflow = 'visible'
  measurer.style.display = 'block'
  measurer.style.webkitLineClamp = 'unset'
  measurer.style.webkitBoxOrient = 'unset'

  measurer.textContent = text

  document.body.appendChild(measurer)
  const height = measurer.scrollHeight
  document.body.removeChild(measurer)

  return height
}

/**
 * Monotonic font-size fitting algorithm.
 * Starts from maxFontSize and decreases until text fits within maxLines,
 * or reaches minFontSize. When allowed, it uses additional lines at that
 * minimum size if the measured element has enough height.
 *
 * @returns TextFitResult with fitted fontSize and proportional lineHeight, or null if no adjustment needed
 */
function calculateFittedFontSize(
  element: HTMLElement,
  text: string,
  maxLines: number,
  maxFontSize: number,
  minFontSize: number,
  allowMoreLines: boolean,
): TextFitResult | null {
  const lineHeightRatio = getMaxLineHeightRatioFromElement(element, maxFontSize)
  const originalLineHeight = maxFontSize * lineHeightRatio

  // Test at max size first
  const maxHeight = measureTextHeight(
    element,
    text,
    maxFontSize,
    lineHeightRatio,
  )
  const maxLinesHeight = originalLineHeight * maxLines
  const availableHeight = element.clientHeight
  const fitTolerance = Math.max(2, maxFontSize * 0.05)
  const targetHeightAtMax =
    availableHeight > 0
      ? Math.min(maxLinesHeight, availableHeight)
      : maxLinesHeight

  // If fits at max, no adjustment needed
  if (maxHeight <= targetHeightAtMax + fitTolerance) {
    return null
  }

  // Monotonic shrinking: start from max, decrease by step until it fits
  for (
    let fontSize = maxFontSize;
    fontSize >= minFontSize;
    fontSize -= STEP_SIZE
  ) {
    const height = measureTextHeight(element, text, fontSize, lineHeightRatio)
    const lineHeight = fontSize * lineHeightRatio // Maintain original ratio
    const targetHeight =
      availableHeight > 0
        ? Math.min(lineHeight * maxLines, availableHeight)
        : lineHeight * maxLines

    // Accept first size where text provably fits (strict inequality for safety)
    if (height <= targetHeight + 0.5) {
      return {
        fontSize: Math.round(fontSize * 10) / 10, // Round to 1 decimal to prevent floating-point issues
        lineHeight:
          Math.round(
            Math.max(lineHeight, fontSize * MIN_LINE_HEIGHT_RATIO) * 10,
          ) / 10,
        maxLines,
      }
    }
  }

  const minLineHeight = Math.max(
    minFontSize * lineHeightRatio,
    minFontSize * MIN_LINE_HEIGHT_RATIO,
  )
  const minTextHeight = measureTextHeight(
    element,
    text,
    minFontSize,
    lineHeightRatio,
  )
  const fittedLines =
    allowMoreLines && availableHeight > 0
      ? minTextHeight <= availableHeight + 0.5
        ? Math.ceil(minTextHeight / minLineHeight)
        : Math.max(1, Math.floor(availableHeight / minLineHeight))
      : maxLines

  // Text doesn't fit at the preferred line count - use more lines at the
  // minimum size when the element's measured height can display them.
  return {
    fontSize: minFontSize,
    lineHeight: Math.round(minLineHeight * 10) / 10,
    maxLines: allowMoreLines ? Math.max(maxLines, fittedLines) : maxLines,
  }
}

/**
 * Result of text fitting calculation.
 */
export interface TextFitResult {
  fontSize: number
  lineHeight: number
  maxLines?: number
}

/**
 * Custom hook for dynamic font-size fitting based on max line count.
 *
 * Automatically detects the maximum font-size from the element's computed styles
 * (set by variant SCSS) and monotonically shrinks until text fits within the
 * specified number of lines. Reacts to resize events, font loading, and content changes.
 *
 * @param ref - React ref to the Typography element being measured
 * @param variant - Typography variant (affects font-weight, etc.)
 * @param text - Text content to fit
 * @param maxLines - Maximum number of lines allowed (0 to disable)
 * @returns TextFitResult with fitted font-size and line-height, or null if no adjustment needed
 */
export function useTextFit(
  ref: React.RefObject<HTMLElement | null>,
  variant: TypographyVariant,
  text: string,
  maxLines: number,
  minFontSize = MIN_FONT_SIZE,
  allowMoreLines = false,
): TextFitResult | null {
  const [fittedResult, setFittedResult] = useState<TextFitResult | null>(null)
  const [breakpoint, setBreakpoint] = useState<Breakpoint | null>(
    getCurrentBreakpoint,
  )

  // Track font loading state
  const [fontsLoaded, setFontsLoaded] = useState<boolean>(false)

  // Early return if text fitting is not enabled
  const isEnabled = maxLines > 0 && text.length > 0

  // Handle breakpoint changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const tabletQuery = window.matchMedia(
      '(min-width: 768px) and (max-width: 1023px)',
    )
    const desktopQuery = window.matchMedia('(min-width: 1024px)')

    const updateBreakpoint = () => {
      setBreakpoint(getCurrentBreakpoint())
      // Clear cache when breakpoint changes - new SCSS font size will apply
      if (ref.current) {
        maxFontSizeCache.delete(ref.current)
        maxLineHeightRatioCache.delete(ref.current)
      }
    }

    mobileQuery.addEventListener('change', updateBreakpoint)
    tabletQuery.addEventListener('change', updateBreakpoint)
    desktopQuery.addEventListener('change', updateBreakpoint)

    return () => {
      mobileQuery.removeEventListener('change', updateBreakpoint)
      tabletQuery.removeEventListener('change', updateBreakpoint)
      desktopQuery.removeEventListener('change', updateBreakpoint)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle font loading
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) {
      setFontsLoaded(true)
      return
    }

    // Check if fonts are already loaded
    if (document.fonts.status === 'loaded') {
      setFontsLoaded(true)
      return
    }

    document.fonts.ready
      .then(() => {
        setFontsLoaded(true)
      })
      .catch(() => {
        // Fallback: assume loaded after timeout
        setFontsLoaded(true)
      })
  }, [])

  // Clear cache when variant changes (different SCSS font sizes)
  useEffect(() => {
    if (ref.current) {
      maxFontSizeCache.delete(ref.current)
      maxLineHeightRatioCache.delete(ref.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant])

  // Recalculate fitted font size
  useLayoutEffect(() => {
    if (!isEnabled || !ref.current || !fontsLoaded) {
      setFittedResult(null)
      return
    }

    const element = ref.current
    const raf = requestAnimationFrame(() => {
      const maxFontSize = getMaxFontSizeFromElement(element)
      const fitted = calculateFittedFontSize(
        element,
        text,
        maxLines,
        maxFontSize,
        Math.max(1, minFontSize),
        allowMoreLines,
      )
      setFittedResult((prev) => {
        // Both null - no change
        if (prev === null && fitted === null) return prev

        // One is null, other isn't - changed
        if (prev === null || fitted === null) return fitted

        // Both non-null - check if values changed
        if (
          prev.fontSize === fitted.fontSize &&
          prev.lineHeight === fitted.lineHeight
        ) {
          return prev // No change, keep previous
        }

        return fitted // Changed, update
      })
    })

    const initialRect = element.getBoundingClientRect()
    let previousWidth = initialRect.width
    let previousHeight = initialRect.height
    let resizeRaf: number | undefined
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(([entry]) => {
            const nextWidth = entry.contentRect.width
            const nextHeight = entry.contentRect.height
            if (
              Math.abs(nextWidth - previousWidth) < 1 &&
              Math.abs(nextHeight - previousHeight) < 1
            ) {
              return
            }
            previousWidth = nextWidth
            previousHeight = nextHeight
            if (resizeRaf !== undefined) {
              cancelAnimationFrame(resizeRaf)
            }
            resizeRaf = requestAnimationFrame(() => {
              const maxFontSize = getMaxFontSizeFromElement(element)
              const fitted = calculateFittedFontSize(
                element,
                text,
                maxLines,
                maxFontSize,
                Math.max(1, minFontSize),
                allowMoreLines,
              )
              setFittedResult((prev) => {
                if (prev === null && fitted === null) return prev
                if (prev === null || fitted === null) return fitted
                return prev.fontSize === fitted.fontSize &&
                  prev.lineHeight === fitted.lineHeight
                  ? prev
                  : fitted
              })
            })
          })
    observer?.observe(element)

    return () => {
      cancelAnimationFrame(raf)
      if (resizeRaf !== undefined) {
        cancelAnimationFrame(resizeRaf)
      }
      observer?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    variant,
    text,
    maxLines,
    minFontSize,
    allowMoreLines,
    fontsLoaded,
    breakpoint,
    isEnabled,
  ])

  return fittedResult
}
