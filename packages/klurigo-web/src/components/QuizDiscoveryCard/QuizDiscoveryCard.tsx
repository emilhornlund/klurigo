import { faListOl, faPlay, faStar } from '@fortawesome/free-solid-svg-icons'
import type { DiscoveryQuizCardDto } from '@klurigo/common'
import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'

import colors from '../../styles/colors.module.scss'
import { CardInfoItem, CardMetaItem, MediaInfoCard } from '../MediaInfoCard'

/**
 * Props for the QuizDiscoveryCard component.
 */
export type QuizDiscoveryCardProps = {
  /** The quiz data to display in the card. */
  readonly quiz: DiscoveryQuizCardDto
}

/**
 * Renders a compact quiz card for use in discovery rails.
 *
 * Displays a cover image (with SVG fallback), title, author name,
 * question count, play count, and star rating. Clicking the card
 * navigates to the quiz details page.
 */
const QuizDiscoveryCard: FC<QuizDiscoveryCardProps> = ({ quiz }) => {
  const navigate = useNavigate()

  const handleClick = (): void => {
    navigate(`/quiz/details/${quiz.id}`)
  }

  const info = (
    <CardInfoItem size="small" data-testid="info-author">
      {quiz.author.name}
    </CardInfoItem>
  )

  const meta = (
    <>
      <CardMetaItem icon={faListOl} data-testid="meta-number-of-questions">
        {quiz.numberOfQuestions}
      </CardMetaItem>

      <CardMetaItem icon={faPlay} data-testid="meta-number-of-plays">
        {quiz.gameplaySummary.count}
      </CardMetaItem>

      {quiz.ratingSummary.stars > 0 && (
        <CardMetaItem
          icon={faStar}
          textColor={colors.yellow2}
          data-testid="meta-rating">
          {quiz.ratingSummary.stars.toFixed(1)}
        </CardMetaItem>
      )}
    </>
  )

  return (
    <MediaInfoCard
      title={quiz.title}
      imageURL={quiz.imageCoverURL}
      imageAlt={quiz.title}
      info={info}
      meta={meta}
      onClick={handleClick}
      data-testid="quiz-discovery-card"
    />
  )
}

export default QuizDiscoveryCard
