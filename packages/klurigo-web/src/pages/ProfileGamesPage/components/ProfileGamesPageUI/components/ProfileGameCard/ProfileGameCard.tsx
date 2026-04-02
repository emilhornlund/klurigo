import {
  faClock,
  faGamepad,
  faPlayCircle,
  faRankingStar,
  faStar,
  faUserTie,
} from '@fortawesome/free-solid-svg-icons'
import type { GameHistoryDto } from '@klurigo/common'
import { GameParticipantType, GameStatus } from '@klurigo/common'
import type { FC } from 'react'

import {
  CardInfoItem,
  CardMetaItem,
  MediaInfoCard,
} from '../../../../../../components'
import { GameModeLabels } from '../../../../../../models'
import colors from '../../../../../../styles/colors.tokens.module.scss'
import {
  DATE_FORMATS,
  formatLocalDate,
  formatTimeAgo,
} from '../../../../../../utils/date.utils'

/**
 * Props for the ProfileGameCard component.
 */
export type ProfileGameCardProps = {
  /** The game history entry to display in the card. */
  readonly game: GameHistoryDto
  /** Callback invoked when the card is activated. */
  readonly onClick: (id: string, status: GameStatus) => void
}

/**
 * Renders a compact game card for use in the profile games page.
 *
 * Displays the game cover, title, status-specific information, and metadata
 * such as game mode and created time.
 */
const ProfileGameCard: FC<ProfileGameCardProps> = ({ game, onClick }) => {
  const isActive = game.status === GameStatus.Active
  const isCompletedPlayer =
    game.status === GameStatus.Completed &&
    game.participantType === GameParticipantType.PLAYER
  const isCompletedHost =
    game.status === GameStatus.Completed &&
    game.participantType === GameParticipantType.HOST

  const info = (
    <>
      {isActive && (
        <CardInfoItem
          icon={faPlayCircle}
          iconColor={colors.colorStatusWarning}
          data-testid="info-active">
          Ongoing
        </CardInfoItem>
      )}

      {isCompletedHost && (
        <CardInfoItem
          icon={faUserTie}
          iconColor={colors.colorActionDefault}
          data-testid="info-host">
          Host
        </CardInfoItem>
      )}

      {isCompletedPlayer && (
        <>
          <CardInfoItem
            icon={faRankingStar}
            iconColor={colors.colorStatusSuccess}
            data-testid="info-rank">
            {game.rank}
          </CardInfoItem>
          <CardInfoItem
            icon={faStar}
            iconColor={colors.colorRatingDefault}
            data-testid="info-score">
            {game.score}
          </CardInfoItem>
        </>
      )}
    </>
  )

  const meta = (
    <>
      <CardMetaItem icon={faGamepad} data-testid="meta-gamemode">
        {GameModeLabels[game.mode]}
      </CardMetaItem>

      <CardMetaItem
        icon={faClock}
        title={formatLocalDate(game.created, DATE_FORMATS.DATE_TIME_SECONDS)}
        data-testid="meta-created">
        {formatTimeAgo(game.created)}
      </CardMetaItem>
    </>
  )

  return (
    <MediaInfoCard
      title={game.name}
      imageURL={game.imageCoverURL}
      imageAlt={game.name}
      info={info}
      meta={meta}
      onClick={() => onClick(game.id, game.status)}
      data-testid="profile-game-card"
    />
  )
}

export default ProfileGameCard
