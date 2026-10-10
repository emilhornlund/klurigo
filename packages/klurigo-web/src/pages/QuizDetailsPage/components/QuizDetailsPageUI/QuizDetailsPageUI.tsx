import { faPen, faPlay, faTrash } from '@fortawesome/free-solid-svg-icons'
import type { QuizRatingDto, QuizResponseDto } from '@klurigo/common'
import type { FC } from 'react'
import { useState } from 'react'

import {
  Button,
  ConfirmDialog,
  LoadingSpinner,
  Page,
  PageDivider,
  ResponsiveImage,
  Stack,
  Typography,
} from '../../../../components'

import QuizDetails from './components/QuizDetails'
import RatingsSection from './components/RatingsSection'
import styles from './QuizDetailsPageUI.module.scss'

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
      <Page layout="fill" align="start" profile>
        <LoadingSpinner />
      </Page>
    )
  }

  return (
    <Page
      layout="contained"
      align="start"
      header={
        isOwner && (
          <>
            <Button
              id="delete-quiz-button"
              type="button"
              variant="primary"
              intent="danger"
              size="small"
              value="Delete"
              hideValue="mobile"
              aria-label="Delete quiz"
              icon={faTrash}
              onClick={() => setShowConfirmDeleteDialog(true)}
            />
            <Button
              id="edit-quiz-button"
              type="button"
              variant="primary"
              surface="brand"
              size="small"
              value="Edit"
              hideValue="mobile"
              aria-label="Edit quiz"
              icon={faPen}
              onClick={onEditQuiz}
            />
          </>
        )
      }
      discover
      profile>
      <Stack spacing="page" className={styles.layout}>
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

        <Button
          id="host-game-button"
          type="button"
          variant="primary"
          intent="accent"
          value="Host Game"
          icon={faPlay}
          onClick={() => setShowConfirmHostGameModal(true)}
        />

        {quiz.imageCoverURL && (
          <div className={styles.thumbnailContainer}>
            <ResponsiveImage imageURL={quiz.imageCoverURL} />
          </div>
        )}

        <QuizDetails quiz={quiz} />

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
      </Stack>

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
