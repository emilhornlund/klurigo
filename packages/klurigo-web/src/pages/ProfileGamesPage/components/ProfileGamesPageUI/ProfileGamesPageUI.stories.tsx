import type { GameHistoryDto } from '@klurigo/common'
import { GameMode, GameParticipantType, GameStatus } from '@klurigo/common'
import type { Meta, StoryObj } from '@storybook/react'
import { userEvent } from 'storybook/test'
import { withRouter } from 'storybook-addon-remix-react-router'
import { v4 as uuidv4 } from 'uuid'

import { withMockAuth } from '../../../../../.storybook/mockAuthContext'

import ProfileGamesPageUI from './ProfileGamesPageUI'

const meta = {
  title: 'Pages/ProfileGamesPage',
  component: ProfileGamesPageUI,
  decorators: [withRouter, withMockAuth],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ProfileGamesPageUI>

export default meta
type Story = StoryObj<typeof meta>

const makeGames = (): GameHistoryDto[] => [
  {
    id: uuidv4(),
    name: 'Math Marathon',
    mode: GameMode.ZeroToOneHundred,
    status: GameStatus.Active,
    imageCoverURL: undefined,
    participantType: GameParticipantType.PLAYER,
    rank: 1,
    score: 6400,
    created: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: uuidv4(),
    name: 'Science Challenge',
    mode: GameMode.ZeroToOneHundred,
    status: GameStatus.Completed,
    imageCoverURL: undefined,
    participantType: GameParticipantType.HOST,
    created: new Date(Date.now() - 60 * 12 * 1000),
  },
  {
    id: uuidv4(),
    name: 'World History Battle',
    mode: GameMode.Classic,
    status: GameStatus.Completed,
    imageCoverURL: 'https://picsum.photos/seed/hist/400/250',
    participantType: GameParticipantType.PLAYER,
    rank: 1,
    score: 9200,
    created: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: uuidv4(),
    name: 'General Knowledge Quiz',
    mode: GameMode.Classic,
    status: GameStatus.Completed,
    imageCoverURL: undefined,
    participantType: GameParticipantType.PLAYER,
    rank: 2,
    score: 8500,
    created: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: uuidv4(),
    name: 'Geography Explorer',
    mode: GameMode.Classic,
    status: GameStatus.Completed,
    imageCoverURL: 'https://picsum.photos/seed/geo/400/250',
    participantType: GameParticipantType.PLAYER,
    rank: 5,
    score: 4200,
    created: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
  },
]

export const Default = {
  args: {
    games: makeGames(),
    filter: {},
    hasNoMatchingGames: false,
    onChangeFilter: () => undefined,
    isLoading: false,
    isLoadingMore: false,
    isError: false,
    hasMore: true,
    skeletonCount: 10,
    onLoadMore: () => undefined,
    onClick: () => undefined,
  },
} satisfies Story

export const AllLoaded = {
  args: {
    ...Default.args,
    hasMore: false,
  },
} satisfies Story

export const Empty = {
  args: {
    ...Default.args,
    games: [],
    hasMore: false,
  },
} satisfies Story

export const NoMatchingGames = {
  args: {
    ...Empty.args,
    filter: { search: 'Film trivia' },
    hasNoMatchingGames: true,
  },
} satisfies Story

export const FilterModal = {
  args: {
    ...Default.args,
    games: Default.args.games.filter((game) => game.mode === GameMode.Classic),
    filter: { mode: GameMode.Classic, sort: 'name', order: 'asc' },
    hasMore: false,
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open filters' }))
  },
} satisfies Story

export const Loading = {
  args: {
    ...Empty.args,
    isLoading: true,
  },
} satisfies Story

export const Error = {
  args: {
    ...Empty.args,
    isError: true,
  },
} satisfies Story
