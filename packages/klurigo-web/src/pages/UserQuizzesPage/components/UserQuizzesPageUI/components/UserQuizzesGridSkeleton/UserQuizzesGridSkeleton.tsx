import type { FC, ReactElement } from 'react'

import styles from './UserQuizzesGridSkeleton.module.scss'

/**
 * Skeleton placeholder for the user quizzes discovery grid.
 *
 * Displays an animated loading state matching the public quizzes card layout
 * with a cover image area and three body text lines.
 *
 * @returns A skeleton card component with shimmer animation.
 */
const UserQuizzesGridSkeleton: FC = (): ReactElement => {
  return (
    <div className={styles.skeleton} data-testid="profile-quiz-card-skeleton">
      <div className={styles.skeletonCover} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
      </div>
    </div>
  )
}

export default UserQuizzesGridSkeleton
