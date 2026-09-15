import type { QuestionCorrectAnswerDto } from '@klurigo/common'
import {
  GameParticipantType as ParticipantType,
  QuestionType,
  TokenScope,
  TokenType,
} from '@klurigo/common'
import { act, render, waitFor } from '@testing-library/react'
import type { FC, ReactNode } from 'react'
import { useContext, useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthState } from '../../models'
import { AuthContext } from '../auth/auth-context'

import type { GameContextType } from './game-context'
import { GameContext } from './game-context'
import GameContextProvider from './GameContextProvider'

const mockClient = {
  completeTask: vi.fn().mockResolvedValue(undefined),
  submitQuestionAnswer: vi.fn().mockResolvedValue(undefined),
  leaveGame: vi.fn().mockResolvedValue(undefined),
  addCorrectAnswer: vi.fn().mockResolvedValue(undefined),
  deleteCorrectAnswer: vi.fn().mockResolvedValue(undefined),
  getPlayers: vi.fn().mockResolvedValue([]),
  updateGameSettings: vi.fn().mockResolvedValue({}),
  quitGame: vi.fn().mockResolvedValue(undefined),
  createOrUpdateGameRating: vi.fn().mockResolvedValue({}),
}

const revokeGame = vi.fn().mockResolvedValue(undefined)

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => mockClient,
}))

const fullScreenHandle = {
  active: false,
  enter: vi.fn().mockResolvedValue(undefined),
  exit: vi.fn().mockResolvedValue(undefined),
}

vi.mock('react-full-screen', () => ({
  FullScreen: ({ children }: { children: ReactNode }) => <>{children}</>,
  useFullScreenHandle: () => fullScreenHandle,
}))

const game = {
  [TokenType.Access]: {
    token: 'game-access',
    sub: 'participant-1',
    exp: 1,
    authorities: [],
    gameId: 'game-1',
    participantType: ParticipantType.PLAYER,
  },
  [TokenType.Refresh]: {
    token: 'game-refresh',
    sub: 'participant-1',
    exp: 1,
    authorities: [],
    gameId: 'game-1',
    participantType: ParticipantType.PLAYER,
  },
} as AuthState[TokenScope.Game]

const authContext = {
  game,
  isGameAuthenticated: true,
  isUserAuthenticated: false,
  revokeGame,
  revokeUser: vi.fn().mockResolvedValue(undefined),
  setTokenPair: vi.fn(),
}

function renderProvider(capture: (context: GameContextType) => void) {
  const Probe: FC = () => {
    const context = useContext(GameContext)
    useEffect(() => {
      capture(context)
    }, [context])
    return null
  }

  return render(
    <AuthContext.Provider value={authContext}>
      <GameContextProvider>
        <Probe />
      </GameContextProvider>
    </AuthContext.Provider>,
  )
}

describe('GameContextProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fullScreenHandle.active = false
  })

  it('exposes game claims and delegates game actions with the game ID', async () => {
    let context: GameContextType | undefined
    renderProvider((value) => {
      context = value
    })

    await waitFor(() => expect(context?.gameID).toBe('game-1'))

    const answer: QuestionCorrectAnswerDto = {
      type: QuestionType.Range,
      value: 42,
    }
    const request: Parameters<
      NonNullable<GameContextType['submitQuestionAnswer']>
    >[0] = { type: QuestionType.Range, value: 42 }
    const settings: Parameters<
      NonNullable<GameContextType['updateGameSettings']>
    >[0] = {
      randomizeQuestionOrder: true,
      randomizeAnswerOrder: false,
    }
    const rating: Parameters<
      NonNullable<GameContextType['createOrUpdateGameRating']>
    >[0] = { stars: 5 }

    await act(async () => {
      await context?.completeTask?.()
      await context?.submitQuestionAnswer?.(request)
      await context?.addCorrectAnswer?.(answer)
      await context?.deleteCorrectAnswer?.(answer)
      await context?.getPlayers?.()
      await context?.updateGameSettings?.(settings)
      await context?.quitGame?.()
      await context?.createOrUpdateGameRating?.(rating)
    })

    expect(context?.gameToken).toBe('game-access')
    expect(context?.participantId).toBe('participant-1')
    expect(context?.participantType).toBe(ParticipantType.PLAYER)
    expect(mockClient.completeTask).toHaveBeenCalledWith('game-1')
    expect(mockClient.submitQuestionAnswer).toHaveBeenCalledWith(
      'game-1',
      request,
    )
    expect(mockClient.addCorrectAnswer).toHaveBeenCalledWith('game-1', answer)
    expect(mockClient.deleteCorrectAnswer).toHaveBeenCalledWith(
      'game-1',
      answer,
    )
    expect(mockClient.getPlayers).toHaveBeenCalledWith('game-1')
    expect(mockClient.updateGameSettings).toHaveBeenCalledWith(
      'game-1',
      settings,
    )
    expect(mockClient.quitGame).toHaveBeenCalledWith('game-1')
    expect(mockClient.createOrUpdateGameRating).toHaveBeenCalledWith(
      'game-1',
      rating,
    )
  })

  it('revokes the current participant after leaving, but not when removing another player', async () => {
    let context: GameContextType | undefined
    renderProvider((value) => {
      context = value
    })
    await waitFor(() => expect(context?.gameID).toBe('game-1'))

    await act(async () => {
      await context?.leaveGame?.('other-player')
    })
    expect(mockClient.leaveGame).toHaveBeenCalledWith('game-1', 'other-player')
    expect(revokeGame).not.toHaveBeenCalled()

    await act(async () => {
      await context?.leaveGame?.('participant-1')
    })
    expect(mockClient.leaveGame).toHaveBeenCalledWith('game-1', 'participant-1')
    expect(revokeGame).toHaveBeenCalledTimes(1)
  })

  it('rejects game actions with a useful error when there is no game session', async () => {
    let context: GameContextType | undefined
    render(
      <AuthContext.Provider value={{ ...authContext, game: undefined }}>
        <GameContextProvider>
          <Probe
            capture={(value) => {
              context = value
            }}
          />
        </GameContextProvider>
      </AuthContext.Provider>,
    )

    await waitFor(() => expect(context?.gameID).toBeUndefined())

    await expect(context?.completeTask?.()).rejects.toThrow('Missing gameID')
    expect(mockClient.completeTask).not.toHaveBeenCalled()
  })
})

const Probe: FC<{ capture: (context: GameContextType) => void }> = ({
  capture,
}) => {
  const context = useContext(GameContext)
  useEffect(() => capture(context), [capture, context])
  return null
}
