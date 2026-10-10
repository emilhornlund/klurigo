import type { IconDefinition } from '@fortawesome/fontawesome-common-types'
import {
  faCalendarPlus,
  faCirclePlay,
  faCircleQuestion,
  faClock,
  faEye,
  faGamepad,
  faGaugeHigh,
  faIcons,
  faLanguage,
  faStar,
  faUser,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { QuizResponseDto } from '@klurigo/common'
import type { FC, ReactElement } from 'react'
import { Link } from 'react-router-dom'

import { Surface, Typography } from '../../../../../../components'
import {
  GameModeLabels,
  LanguageLabels,
  QuizCategoryLabels,
  QuizVisibilityLabels,
} from '../../../../../../models'
import {
  DATE_FORMATS,
  formatLocalDate,
  formatTimeAgo,
} from '../../../../../../utils/date.utils'
import { toDifficultyLabel } from '../../../../../../utils/quiz.utils'

import styles from './QuizDetails.module.scss'

const DetailItem: FC<{
  title?: string
  icon: IconDefinition
  value?: string
  children?: ReactElement | string | number
}> = ({ value, icon, title, children }) => (
  <div className={styles.item} title={title ?? value}>
    <FontAwesomeIcon icon={icon} className={styles.icon} />
    <Typography variant="body2" align="center" color="inverse" bold>
      {value || children}
    </Typography>
  </div>
)

export type QuizDetailsProps = {
  quiz: QuizResponseDto
}

const QuizDetails: FC<QuizDetailsProps> = ({ quiz }) => (
  <Surface className={styles.details}>
    <DetailItem icon={faEye} value={QuizVisibilityLabels[quiz.visibility]} />
    <DetailItem icon={faIcons} value={QuizCategoryLabels[quiz.category]} />
    <DetailItem icon={faLanguage} value={LanguageLabels[quiz.languageCode]} />
    <DetailItem icon={faGamepad} value={GameModeLabels[quiz.mode]} />
    <DetailItem
      icon={faCircleQuestion}
      value={`${quiz.numberOfQuestions} ${quiz.numberOfQuestions === 1 ? 'Question' : 'Questions'}`}
    />
    <DetailItem icon={faUser} title={quiz.author.name || 'N/A'}>
      <Link to={`/users/${quiz.author.id}/profile`}>
        {quiz.author.name || 'N/A'}
      </Link>
    </DetailItem>
    <DetailItem
      icon={faCalendarPlus}
      value={formatTimeAgo(quiz.created)}
      title={`Created ${formatLocalDate(quiz.created, DATE_FORMATS.DATE_TIME_SECONDS)}`}
    />
    <DetailItem
      icon={faStar}
      value={
        quiz.ratingSummary.stars
          ? `${quiz.ratingSummary.stars.toFixed(1)} / 5.0`
          : 'N/A'
      }
      title="Average rating"
    />
    <DetailItem
      icon={faCirclePlay}
      value={
        quiz.gameplaySummary.count > 0
          ? `${quiz.gameplaySummary.count} times`
          : 'N/A'
      }
      title="Total plays"
    />
    <DetailItem
      icon={faUsers}
      value={`${quiz.gameplaySummary?.totalPlayerCount || 'N/A'}`}
      title="Total players"
    />
    <DetailItem
      icon={faGaugeHigh}
      value={
        toDifficultyLabel(quiz.gameplaySummary?.difficultyPercentage) || 'N/A'
      }
      title="Estimated difficulty"
    />
    <DetailItem
      icon={faClock}
      value={
        quiz.gameplaySummary?.lastPlayed
          ? formatTimeAgo(quiz.gameplaySummary.lastPlayed)
          : 'N/A'
      }
      title={
        quiz.gameplaySummary?.lastPlayed
          ? `Last played ${formatLocalDate(quiz.gameplaySummary.lastPlayed, DATE_FORMATS.DATE_TIME_SECONDS)}`
          : 'Never played'
      }
    />
  </Surface>
)

export default QuizDetails
