import { faImage } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { FC, ReactNode } from 'react'

import { classNames } from '../../utils/helpers'
import ResponsiveImage from '../ResponsiveImage'
import Typography from '../Typography'

import styles from './MediaInfoCard.module.scss'

/**
 * Props for the MediaInfoCard component.
 */
export type MediaInfoCardProps = {
  /** Primary title displayed in the card body. */
  readonly title: string
  /** Optional image URL rendered in the cover area. */
  readonly imageURL?: string | null
  /** Alt text for the cover image. */
  readonly imageAlt: string
  /** Optional content rendered below the title. */
  readonly info?: ReactNode
  /** Optional metadata row rendered at the bottom of the card body. */
  readonly meta?: ReactNode
  /** Optional callback invoked when the card is activated. */
  readonly onClick?: () => void
  /** Optional test id for the outer element. */
  readonly 'data-testid'?: string
  /** Optional extra class name. */
  readonly className?: string
}

/**
 * Renders a reusable clickable media card with cover, title, info, and meta sections.
 */
const MediaInfoCard: FC<MediaInfoCardProps> = ({
  title,
  imageURL,
  imageAlt,
  info,
  meta,
  onClick,
  className,
  'data-testid': dataTestId,
}) => {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      type={onClick ? 'button' : undefined}
      className={classNames(styles.card, className)}
      onClick={onClick}
      data-testid={dataTestId}>
      <div className={styles.cover}>
        {imageURL ? (
          <ResponsiveImage
            imageURL={imageURL}
            alt={imageAlt}
            fit="fill"
            noCornerRadius
            noBorder
          />
        ) : (
          <div className={styles.coverFallback} data-testid="cover-fallback">
            <FontAwesomeIcon icon={faImage} />
          </div>
        )}
      </div>

      <div className={styles.body}>
        <Typography
          variant="control"
          align="left"
          color="default"
          title={title}
          noOpacity
          truncate
          bold>
          {title}
        </Typography>

        {info ? <div className={styles.info}>{info}</div> : null}
        {meta ? <div className={styles.meta}>{meta}</div> : null}
      </div>
    </Component>
  )
}

export default MediaInfoCard
