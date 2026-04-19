import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { DiscoveryQuizCardDto, DiscoverySectionKey } from '@klurigo/common'
import { type FC } from 'react'
import { Link } from 'react-router-dom'

import {
  HorizontalRail,
  QuizDiscoveryCard,
  RailHeader,
  Typography,
} from '../../../../../../components'

import styles from './DiscoveryRailSection.module.scss'

/** Number of skeleton placeholder cards shown during loading. */
const DISCOVERY_RAIL_SKELETON_COUNT = 10

/**
 * Props for the DiscoveryRailSection component.
 */
export type DiscoveryRailSectionProps = {
  /** The section key used for building the "See all" route. */
  readonly sectionKey: DiscoverySectionKey
  /** The human-readable section heading. */
  readonly title: string
  /** Optional subtitle or contextual description. */
  readonly description?: string
  /** Ordered list of quiz cards to display. */
  readonly quizzes: DiscoveryQuizCardDto[]
  /** When true, renders skeleton placeholder cards instead of real data. */
  readonly isLoading: boolean
}

/**
 * Renders a single horizontal discovery rail section.
 *
 * Displays a heading with an optional description, a horizontally
 * scrollable row of quiz cards (with CSS scroll-snap), and a
 * "See all" link that navigates to the section detail page.
 * When loading, renders skeleton placeholder cards.
 *
 * On desktop, left/right arrow buttons appear on hover to page through
 * the rail. Both arrows are hidden once the rail reaches the respective
 * scroll boundary.
 */
const DiscoveryRailSection: FC<DiscoveryRailSectionProps> = ({
  sectionKey,
  title,
  description,
  quizzes,
  isLoading,
}) => (
  <section className={styles.section} data-testid="discovery-rail-section">
    <RailHeader
      title={title}
      description={description}
      action={
        <Typography variant="link2" width="small" align="right" asChild>
          <Link to={`/discover/section/${sectionKey}`}>
            See all <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </Typography>
      }
    />
    <HorizontalRail>
      {isLoading
        ? Array.from({ length: DISCOVERY_RAIL_SKELETON_COUNT }).map((_, i) => (
            <div
              key={i}
              className={styles.skeleton}
              data-testid="skeleton-card">
              <div className={styles.skeletonCover} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLine} />
              </div>
            </div>
          ))
        : quizzes.map((quiz) => (
            <QuizDiscoveryCard key={quiz.id} quiz={quiz} />
          ))}
    </HorizontalRail>
  </section>
)

export { DISCOVERY_RAIL_SKELETON_COUNT }
export default DiscoveryRailSection
