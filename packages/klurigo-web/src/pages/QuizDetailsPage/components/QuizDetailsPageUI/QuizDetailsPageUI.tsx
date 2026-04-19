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
  faPen,
  faPlay,
  faStar,
  faTrash,
  faUser,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { QuizRatingDto, QuizResponseDto } from '@klurigo/common'
import type { FC, ReactElement } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  Button,
  ConfirmDialog,
  LoadingSpinner,
  Page,
  PageDivider,
  ResponsiveImage,
  Typography,
} from '../../../../components'
import {
  GameModeLabels,
  LanguageLabels,
  QuizCategoryLabels,
  QuizVisibilityLabels,
} from '../../../../models'
import {
  DATE_FORMATS,
  formatLocalDate,
  formatTimeAgo,
} from '../../../../utils/date.utils'
import { toDifficultyLabel } from '../../../../utils/quiz.utils'

import RatingsSection from './components/RatingsSection'
import styles from './QuizDetailsPageUI.module.scss'

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

export interface QuizDetailsPageUIProps {
  quiz?: QuizResponseDto
  ratings?: QuizRatingDto[]
  isOwner?: boolean
  isLoadingQuiz?: boolean
  isLoadingRatings?: boolean
  isHostGameLoading?: boolean
  isDeleteQuizLoading?: boolean
  onHostGame: () => void
  onEditQuiz: () => void
  onDeleteQuiz: () => void
}

const QuizDetailsPageUI: FC<QuizDetailsPageUIProps> = ({
  quiz,
  ratings,
  isOwner = false,
  isLoadingQuiz,
  isLoadingRatings,
  isHostGameLoading,
  isDeleteQuizLoading,
  onHostGame,
  onEditQuiz,
  onDeleteQuiz,
}) => {
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false)

  const [showConfirmHostGameModal, setShowConfirmHostGameModal] =
    useState<boolean>(false)

  if (!quiz || isLoadingQuiz) {
    return (
      <Page align="start" height="full" profile>
        <LoadingSpinner />
      </Page>
    )
  }

  return (
    <Page align="start" height="full" noPadding discover profile>
      <div className={styles.layout}>
        <Typography variant="title" width="full" align="center" color="inverse">
          {quiz.title}
        </Typography>

        {quiz.description && (
          <Typography
            variant="body"
            width="medium"
            align="center"
            color="inverse">
            {quiz.description}
          </Typography>
        )}

        <div className={styles.actions}>
          {isOwner && (
            <>
              <Button
                id="delete-quiz-button"
                type="button"
                kind="destructive"
                size="small"
                value="Delete"
                hideValue="mobile"
                icon={faTrash}
                onClick={() => setShowConfirmDeleteDialog(true)}
              />
              <Button
                id="edit-quiz-button"
                type="button"
                kind="primary"
                size="small"
                value="Edit"
                hideValue="mobile"
                icon={faPen}
                onClick={onEditQuiz}
              />
            </>
          )}
          <Button
            id="host-game-button"
            type="button"
            kind="call-to-action"
            size="small"
            value="Host Game"
            hideValue="mobile"
            icon={faPlay}
            onClick={() => setShowConfirmHostGameModal(true)}
          />
        </div>

        {quiz.imageCoverURL && (
          <div className={styles.thumbnailContainer}>
            <ResponsiveImage imageURL={quiz.imageCoverURL} />
          </div>
        )}

        <div className={styles.details}>
          <DetailItem
            icon={faEye}
            value={QuizVisibilityLabels[quiz.visibility]}
          />
          <DetailItem
            icon={faIcons}
            value={QuizCategoryLabels[quiz.category]}
          />
          <DetailItem
            icon={faLanguage}
            value={LanguageLabels[quiz.languageCode]}
          />
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
              toDifficultyLabel(quiz.gameplaySummary?.difficultyPercentage) ||
              'N/A'
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
        </div>

        {quiz.ratingSummary.stars > 0 && (
          <>
            <PageDivider />
            <RatingsSection
              summary={quiz.ratingSummary}
              ratings={ratings ?? []}
              isLoading={isLoadingRatings}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        title="Host Game"
        message="Are you sure you want to start hosting a new game? Players will be able to join as soon as the game starts."
        open={showConfirmHostGameModal}
        loading={isHostGameLoading}
        onConfirm={onHostGame}
        onClose={() => setShowConfirmHostGameModal(false)}
      />

      <ConfirmDialog
        title="Delete Quiz"
        message="Are you sure you want to delete this quiz?"
        open={showConfirmDeleteDialog}
        loading={isDeleteQuizLoading}
        onConfirm={onDeleteQuiz}
        onClose={() => setShowConfirmDeleteDialog(false)}
        destructive
      />
    </Page>
  )
}

export default QuizDetailsPageUI
