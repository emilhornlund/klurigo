import { faListOl, faPlay, faStar } from '@fortawesome/free-solid-svg-icons'
import type { DiscoveryQuizCardDto } from '@klurigo/common'
import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  GameModeLabels,
  LanguageLabels,
  QuizCategoryLabels,
} from '../../models/labels'
import colors from '../../styles/colors.tokens.module.scss'
import { CardInfoItem, CardMetaItem, MediaInfoCard } from '../MediaInfoCard'
import PlayerAvatar from '../PlayerAvatar'

import styles from './QuizDiscoveryCard.module.scss'

/**
 * Props for the QuizDiscoveryCard component.
 */
export type QuizDiscoveryCardProps = {
  /** The quiz data to display in the card. */
  readonly quiz: DiscoveryQuizCardDto
}

/**
 * Renders a compact quiz card for use in discovery rails and grids.
 *
 * Displays a cover image (with SVG fallback), title, category, game mode,
 * language, author name, question count, play count, and star rating.
 * Activating the card navigates to the quiz details page.
 */
const QuizDiscoveryCard: FC<QuizDiscoveryCardProps> = ({ quiz }) => {
  const navigate = useNavigate()

  const handleClick = (): void => {
    navigate(`/quiz/details/${quiz.id}`)
  }

  const subtitle = [
    QuizCategoryLabels[quiz.category],
    GameModeLabels[quiz.mode],
    LanguageLabels[quiz.languageCode],
  ].join('\u00a0· ')

  const info = (
    <CardInfoItem
      size="small"
      data-testid="info-author"
      className={styles.author}
      title={quiz.author.name}>
      <PlayerAvatar avatar={quiz.author.avatar} size={24} alt="" />
      <span className={styles.name}>{quiz.author.name}</span>
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
          textColor={colors.colorRatingDefault}
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
      subtitle={<span className={styles.subtitle}>{subtitle}</span>}
      info={info}
      meta={meta}
      onClick={handleClick}
      data-testid="quiz-discovery-card"
    />
  )
}

export default QuizDiscoveryCard
