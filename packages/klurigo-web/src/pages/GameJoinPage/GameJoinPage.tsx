import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthContext } from '../../context/auth'
import { useGameContext } from '../../context/game'
import { useUserContext } from '../../context/user'

import { GameJoinPageUI } from './components'
import { useGameJoinAvatar } from './use-game-join-avatar'
import { useGameJoinSubmission } from './use-game-join-submission'

/** Prepares the signed identity's avatar and coordinates account saving before joining. */
const GameJoinPage: FC = () => {
  const navigate = useNavigate()
  const { gameID, participantId } = useGameContext()
  const { user, isUserAuthenticated, revokeGame } = useAuthContext()
  const { currentUser } = useUserContext()
  const identityKey = `${gameID}:${participantId}:${isUserAuthenticated ? user?.ACCESS.sub : 'guest'}`
  const avatar = useGameJoinAvatar()
  const submission = useGameJoinSubmission({
    identityKey,
    gameID,
    avatar: avatar.avatar,
    needsSave: avatar.needsSave,
    hasSavedAccountDesign: avatar.hasSavedAccountDesign,
    commitAvatar: avatar.commitAvatar,
  })
  const initialNickname =
    currentUser?.id === user?.ACCESS.sub
      ? (currentUser?.defaultNickname ?? '')
      : ''

  return (
    <GameJoinPageUI
      key={identityKey}
      avatar={avatar.avatar}
      initialNickname={initialNickname}
      isUserAuthenticated={isUserAuthenticated}
      busy={submission.busy}
      preparing={avatar.isLoading}
      canEdit={avatar.canEdit}
      error={avatar.error}
      message={submission.message}
      onBack={() => void revokeGame({ redirectTo: '/' })}
      onLogin={() => navigate('/auth/login')}
      onRetry={avatar.retry}
      onSubmit={(nickname) => void submission.submit(nickname)}
      onAvatarChange={(design) => {
        avatar.setAvatar(design)
        submission.clearMessage()
      }}
    />
  )
}

export default GameJoinPage
