import { GameParticipantType } from '@klurigo/common'
import type { Decorator } from '@storybook/react'

import { GameContext, type GameContextType } from '../src/context/game'

const gameID = ''

const mockGameHostContext: GameContextType = {
  gameID,
  gameToken: '',
  participantId: '',
  participantType: GameParticipantType.HOST,
  isFullscreenActive: false,
  completeTask: () => Promise.reject(),
  submitQuestionAnswer: () => Promise.reject(),
  leaveGame: () => Promise.reject(),
  addCorrectAnswer: () => Promise.reject(),
  deleteCorrectAnswer: () => Promise.reject(),
  getPlayers: () =>
    Promise.resolve([
      {
        id: '931e5c7d-a28d-425d-86dc-00269aab31aa',
        nickname: 'ShadowCyborg',
      },
      {
        id: '5c5fd03b-87d3-4df5-a01d-1e5a6935ea9c',
        nickname: 'Radar',
      },
      {
        id: '82b1c98e-79b0-42b7-8404-0b1a5d3025d9',
        nickname: 'ShadowWhirlwind',
      },
      {
        id: '6c56ad63-1296-4503-afc8-ef33df7eb259',
        nickname: 'WhiskerFox',
      },
      {
        id: '341c8e29-3dd8-4d77-a457-fc286bb7ac18',
        nickname: 'JollyNimbus',
      },
      {
        id: '459aef0d-175a-4ff3-bbe2-c19517727d31',
        nickname: 'PuddingPop',
      },
      {
        id: '9e390dd8-ecb5-4ad9-b331-d17414b89344',
        nickname: 'MysticPine',
      },
      {
        id: 'bbc5ca82-7c7f-48f0-bef4-3aa949510c5f',
        nickname: 'FrostyBear',
      },
      {
        id: '12d6f433-907a-4e86-b725-861522ff385d',
        nickname: 'Willo',
      },
      {
        id: 'd7a9891f-b237-4df6-ba49-b635aa02a0dd',
        nickname: 'ScarletFlame',
      },
    ]),
  updateGameSettings: (settings) => Promise.resolve(settings),
  toggleFullscreen: () => Promise.reject(),
  quitGame: () => Promise.reject(),
}

export const withMockGameHost: Decorator = (Story, context) => (
  <GameContext.Provider value={mockGameHostContext}>
    <Story {...context.args} />
  </GameContext.Provider>
)

const mockGamePlayerContext: GameContextType = {
  gameID: '',
  gameToken: '',
  participantId: '',
  participantType: GameParticipantType.PLAYER,
  isFullscreenActive: false,
  completeTask: () => Promise.reject(),
  submitQuestionAnswer: () => Promise.reject(),
  leaveGame: () => Promise.reject(),
  addCorrectAnswer: () => Promise.reject(),
  deleteCorrectAnswer: () => Promise.reject(),
  getPlayers: () => Promise.reject(),
  createOrUpdateGameRating: () => Promise.reject(),
  updateGameSettings: () => Promise.reject(),
  toggleFullscreen: () => Promise.reject(),
  quitGame: () => Promise.reject(),
}

export const withMockGamePlayer: Decorator = (Story, context) => (
  <GameContext.Provider value={mockGamePlayerContext}>
    <Story {...context.args} />
  </GameContext.Provider>
)
