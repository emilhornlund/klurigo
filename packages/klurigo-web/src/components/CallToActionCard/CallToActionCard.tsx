import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type FC } from 'react'

import Typography from '../Typography'

import styles from './CallToActionCard.module.scss'

/**
 * Props for the CallToActionCard component.
 *
 * Defines the content and behavior of a prominent call-to-action card
 * used to guide the user toward a primary action.
 */
export type CallToActionCardProps = {
  /**
   * The main heading displayed in the card.
   *
   * Should clearly describe the primary action or value proposition.
   */
  title: string

  /**
   * Supporting descriptive text displayed below the title.
   *
   * Typically used to highlight benefits or explain the action.
   */
  text: string

  /**
   * Callback invoked when the card is clicked.
   *
   * Used to trigger navigation or another primary action.
   */
  onClick: () => void
}

/**
 * A reusable, prominent call-to-action card.
 *
 * Renders a full-width clickable card with a title, descriptive text,
 * and a directional icon to indicate progression or navigation.
 */
const CallToActionCard: FC<CallToActionCardProps> = ({
  title,
  text,
  onClick,
}) => (
  <div className={styles.callToActionCard}>
    <button type="button" className={styles.button} onClick={onClick}>
      <div className={styles.content}>
        <Typography variant="title3" align="center" color="inverse">
          {title}
        </Typography>
        <Typography variant="body2" align="center" color="inverse">
          {text}
        </Typography>
      </div>
      <div className={styles.icon}>
        <FontAwesomeIcon icon={faArrowRight} />
      </div>
    </button>
  </div>
)

export default CallToActionCard
