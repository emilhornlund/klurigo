import {
  DEFAULT_CRITTERS_AVATAR_V1,
  GAME_MAX_PLAYERS,
  GameEventType,
  type GameLobbyHostEvent,
  randomizeCrittersAvatar,
} from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { withRouter } from 'storybook-addon-remix-react-router'
import { v4 as uuidv4 } from 'uuid'

import { withMockGameHost } from '../../../.storybook/mockGameContext'
import type { GameContextType } from '../../context/game'
import { GameContext } from '../../context/game'

import HostLobbyState, { type HostLobbyStateProps } from './HostLobbyState'

const HostLobbyStateComponent: FC<HostLobbyStateProps> = (props) => {
  const [players, setPlayers] = useState<GameLobbyHostEvent['players']>(
    props.event.players,
  )

  const addPlayer = () => {
    setPlayers([
      ...players,
      {
        id: uuidv4(),
        nickname: `Player${players.length}`,
        avatar: randomizeCrittersAvatar(),
      },
    ])
  }

  const contextValue = useMemo(
    () =>
      ({
        gameID: uuidv4(),
        leaveGame: async (playerID: string): Promise<void> => {
          setPlayers((prev) => prev.filter((player) => player.id !== playerID))
        },
      }) as GameContextType,
    [],
  )

  return (
    <div style={{ width: '100vw' }}>
      <GameContext.Provider value={contextValue}>
        <HostLobbyState {...props} event={{ ...props.event, players }} />
      </GameContext.Provider>
      <div style={{ position: 'absolute', bottom: '1rem', left: '1rem' }}>
        <button
          onClick={addPlayer}
          disabled={players.length >= GAME_MAX_PLAYERS}>
          Simulate Participant Joining
        </button>
      </div>
    </div>
  )
}

const meta = {
  component: HostLobbyState,
  decorators: [withRouter, withMockGameHost],
  parameters: {
    layout: 'fullscreen',
  },
  render: (props) => <HostLobbyStateComponent {...props} />,
} satisfies Meta<typeof HostLobbyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default = {
  args: {
    event: {
      type: GameEventType.GameLobbyHost,
      host: {
        avatar: { ...DEFAULT_CRITTERS_AVATAR_V1, body: 'tower', top: null },
      },
      game: {
        id: 'de6f4af5-f472-4e30-bbeb-97b881e0a569',
        pin: '123456',
        settings: {
          randomizeQuestionOrder: false,
          randomizeAnswerOrder: false,
        },
      },
      players: [
        {
          id: uuidv4(),
          nickname: 'ShadowCyborg',
          avatar: {
            ...DEFAULT_CRITTERS_AVATAR_V1,
            body: 'block' as const,
            top: null,
          },
        },
        {
          id: uuidv4(),
          nickname: 'Radar',
          avatar: {
            ...DEFAULT_CRITTERS_AVATAR_V1,
            body: 'blob' as const,
            pattern: null,
          },
        },
        { id: uuidv4(), nickname: 'ShadowWhirlwind' },
        { id: uuidv4(), nickname: 'WhiskerFox' },
        { id: uuidv4(), nickname: 'JollyNimbus' },
        { id: uuidv4(), nickname: 'PuddingPop' },
        { id: uuidv4(), nickname: 'MysticPine' },
        { id: uuidv4(), nickname: 'FrostyBear' },
        { id: uuidv4(), nickname: 'Willo' },
        { id: uuidv4(), nickname: 'ScarletFlame' },
      ].map((player) => ({ avatar: DEFAULT_CRITTERS_AVATAR_V1, ...player })),
    },
  },
} satisfies Story

/** Constrained-width proof with full capacity and a maximum-length nickname. */
export const FullLobby = {
  args: {
    event: {
      ...Default.args.event,
      players: Array.from({ length: 20 }, (_, index) => ({
        id: `player-${index}`,
        nickname: index === 0 ? 'A'.repeat(20) : `Player${index}`,
        avatar: {
          ...DEFAULT_CRITTERS_AVATAR_V1,
          bodyColor: index % 2 ? '#fcd34d' : '#fda4af',
        },
      })),
    },
  },
} satisfies Story
