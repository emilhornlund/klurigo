import { faBullseye } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type FC, useId } from 'react'

import { Surface, Typography } from '../../../../../../components'
import { classNames } from '../../../../../../utils/helpers'
import { getCorrectPercentage } from '../../utils'

import type { ToughestQuestionMetric } from './summary-section.metrics'
import styles from './SummarySection.module.scss'

const ToughestQuestionCard: FC<{ metric: ToughestQuestionMetric }> = ({
  metric: { question, number, tied },
}) => {
  const headingId = useId()

  return (
    <Surface
      as="section"
      aria-labelledby={headingId}
      className={classNames(
        styles.card,
        styles.full,
        styles.questionHighlight,
      )}>
      <div className={styles.highlightContent}>
        <div className={styles.highlightHeader}>
          <span className={styles.highlightIcon} aria-hidden="true">
            <FontAwesomeIcon icon={faBullseye} />
          </span>
          <div>
            <Typography
              id={headingId}
              variant="title4"
              color="inverse"
              asChild
              noOpacity>
              <h2>
                {tied ? 'One of the toughest questions' : 'Toughest question'}
              </h2>
            </Typography>
            <Typography variant="control2" color="inverse">
              {`Question ${number}`}
            </Typography>
          </div>
        </div>
        <Typography variant="body2" color="inverse" noOpacity>
          {question.text}
        </Typography>
      </div>

      <Typography variant="control2" color="inverse" noOpacity asChild>
        <Surface as="p" className={styles.highlightStat}>
          <Typography
            variant="title2"
            color="inverse"
            className={styles.highlightValue}
            noOpacity
            asChild>
            <strong>{`${getCorrectPercentage(question)}%`}</strong>
          </Typography>
          <span>{' of players answered correctly'}</span>
        </Surface>
      </Typography>
    </Surface>
  )
}

export default ToughestQuestionCard
