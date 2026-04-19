import { type FC, type ReactNode } from 'react'

import Typography from '../Typography'

import styles from './RailHeader.module.scss'

/**
 * Props for the RailHeader component.
 */
export type RailHeaderProps = {
  /** The rail heading text. Rendered as an h2. */
  readonly title: string
  /** Optional subtitle shown below the title. */
  readonly description?: string
  /** Optional content rendered on the trailing side of the header. */
  readonly action?: ReactNode
}

/**
 * Renders a header for a horizontal rail section.
 *
 * Displays a title, an optional description below it, and optionally
 * renders arbitrary content (e.g. a "See all" link) on the trailing side.
 */
const RailHeader: FC<RailHeaderProps> = ({ title, description, action }) => (
  <div className={styles.header}>
    <div className={styles.headerText}>
      <Typography variant="title4" color="inverse">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="inverse">
          {description}
        </Typography>
      )}
    </div>
    <div className={styles.action}>{action}</div>
  </div>
)

export default RailHeader
