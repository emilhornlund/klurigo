import { type GameResultDto, QuizVisibility } from '@klurigo/common'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FC } from 'react'

import { useKlurigoServiceClient } from '../../../../../../api'
import { Modal, Typography } from '../../../../../../components'
import { notifySuccess } from '../../../../../../utils/notification'

type PublishQuizDialogProps = {
  quizId: string
  onClose: () => void
  onPublished: () => void
}

const PublishQuizDialog: FC<PublishQuizDialogProps> = ({
  quizId,
  onClose,
  onPublished,
}) => {
  const queryClient = useQueryClient()
  const { updateQuizVisibility } = useKlurigoServiceClient()

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () => updateQuizVisibility(quizId, QuizVisibility.Public),
    onSuccess: async () => {
      const resultsQueries = { queryKey: ['game_results'] }
      // A results request started before the save must not restore the old prompt.
      await queryClient.cancelQueries(resultsQueries)
      queryClient.setQueriesData<GameResultDto>(resultsQueries, (result) =>
        result?.quiz.id === quizId
          ? { ...result, quiz: { ...result.quiz, canPublishQuiz: false } }
          : result,
      )
      void queryClient.invalidateQueries({
        ...resultsQueries,
        refetchType: 'none',
      })
      void queryClient.invalidateQueries({ queryKey: ['quiz', quizId] })
      void queryClient.invalidateQueries({ queryKey: ['myProfileQuizzes'] })
      onPublished()
      notifySuccess('Your quiz is now public.')
    },
  })

  return (
    <Modal
      title="Make this quiz public?"
      open
      closeAction={{ label: 'Cancel', disabled: isPending, onClick: onClose }}
      primaryAction={{
        label: 'Make public',
        loading: isPending,
        onClick: () => mutate(),
      }}>
      <Typography variant="body2" align="left" noOpacity>
        Anyone will be able to discover this quiz and host their own games. You
        can make it private again in quiz settings.
      </Typography>
      {isError && (
        <div role="alert">
          <Typography variant="control" align="left" color="danger" noOpacity>
            Couldn’t make the quiz public. Please try again.
          </Typography>
        </div>
      )}
    </Modal>
  )
}

export default PublishQuizDialog
