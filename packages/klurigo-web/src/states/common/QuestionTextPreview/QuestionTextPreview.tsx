import type { FC } from 'react'
import { useMemo } from 'react'

import { InfiniteScrollContainer, Typography } from '../../../components'
import { DeviceType } from '../../../utils/device-size.types'
import { useDeviceSizeType } from '../../../utils/useDeviceSizeType'

import styles from './QuestionTextPreview.module.scss'

/**
 * Props for {@link QuestionTextPreview}.
 */
export type QuestionTextPreviewProps = { text: string }

/**
 * Displays question text using the title typography variant and applies
 * automatic vertical looping when the content overflows its container.
 *
 * The scroll speed is selected based on the current device type to keep the
 * perceived reading speed consistent across different font sizes and line
 * heights.
 *
 * @param text - The question text to render.
 * @returns A responsive question text preview with optional infinite scrolling.
 */
const QuestionTextPreview: FC<QuestionTextPreviewProps> = ({ text }) => {
  const deviceType = useDeviceSizeType()

  /**
   * Selects a device-specific scroll speed in pixels per second.
   *
   * The values are tuned for large title typography with line-heights of
   * 4rem/6rem/8rem for mobile/tablet/desktop respectively.
   */
  const speed = useMemo(() => {
    switch (deviceType) {
      case DeviceType.Mobile:
        return 70
      case DeviceType.Tablet:
        return 95
      case DeviceType.Desktop:
        return 110
      default:
        return 95
    }
  }, [deviceType])

  /**
   * Selects a device-specific vertical gap in pixels between the two duplicated
   * content blocks when looping.
   *
   * The values are aligned with the title line-height per breakpoint:
   * - Mobile: 4rem (64px)
   * - Tablet: 6rem (96px)
   * - Desktop: 8rem (128px)
   *
   * This keeps the perceived spacing consistent across devices.
   */
  const gap = useMemo(() => {
    switch (deviceType) {
      case DeviceType.Mobile:
        return 64
      case DeviceType.Tablet:
        return 96
      case DeviceType.Desktop:
        return 128
      default:
        return 96
    }
  }, [deviceType])

  return (
    <InfiniteScrollContainer
      className={styles.questionTextContainer}
      enabled={true}
      pxPerSecond={speed}
      gapPx={gap}
      startDelayMs={1000}
      hAlign="center"
      vAlign="center">
      <Typography variant="extraLargeTitle" width="medium">
        {text}
      </Typography>
    </InfiniteScrollContainer>
  )
}

export default QuestionTextPreview
