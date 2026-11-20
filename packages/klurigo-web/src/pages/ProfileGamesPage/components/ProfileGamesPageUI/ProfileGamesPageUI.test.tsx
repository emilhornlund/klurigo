import type { GameHistoryDto } from '@klurigo/common'
import { GameMode, GameParticipantType, GameStatus } from '@klurigo/common'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../context/auth', () => ({
  useAuthContext: () => ({
    isUserAuthenticated: true,
    revokeUser: vi.fn(),
  }),
}))

import ProfileGamesPageUI from './ProfileGamesPageUI'

const now = new Date('2025-04-27T09:54:14.000Z')
const filterProps = {
  filter: {},
  hasNoMatchingGames: false,
  onChangeFilter: () => undefined,
}

const makeGames = (): GameHistoryDto[] => [
  {
    id: '1de06ead-16f0-47af-b8ba-63279267ffd3',
    name: 'Math Marathon',
    mode: GameMode.ZeroToOneHundred,
    status: GameStatus.Active,
    imageCoverURL: undefined,
    participantType: GameParticipantType.PLAYER,
    rank: 1,
    score: 6400,
    created: new Date(now.getTime() - 5 * 60 * 1000),
  },
  {
    id: '70f14923-6ae9-4daa-950d-56e2e0084c32',
    name: 'Science Challenge',
    mode: GameMode.ZeroToOneHundred,
    status: GameStatus.Completed,
    imageCoverURL: undefined,
    participantType: GameParticipantType.HOST,
    created: new Date(now.getTime() - 60 * 12 * 1000),
  },
  {
    id: '4c14c469-dad1-4f32-8138-d251e8bf60cb',
    name: 'World History Battle',
    mode: GameMode.Classic,
    status: GameStatus.Completed,
    imageCoverURL: undefined,
    participantType: GameParticipantType.PLAYER,
    rank: 1,
    score: 9200,
    created: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  },
]

describe('ProfileGamesPageUI', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render ProfileGamesPageUI with card grid', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProfileGamesPageUI
          {...filterProps}
          games={makeGames()}
          isLoading={false}
          isLoadingMore={false}
          isError={false}
          hasMore={true}
          skeletonCount={10}
          onLoadMore={() => undefined}
          onClick={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render ProfileGamesPageUI empty state with no results', async () => {
    const { container } = render(
      <MemoryRouter>
        <ProfileGamesPageUI
          {...filterProps}
          games={[]}
          isLoading={false}
          isLoadingMore={false}
          isError={false}
          hasMore={false}
          skeletonCount={10}
          onLoadMore={() => undefined}
          onClick={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('shows "No Games Yet" empty state when no games', () => {
    render(
      <MemoryRouter>
        <ProfileGamesPageUI
          {...filterProps}
          games={[]}
          isLoading={false}
          isLoadingMore={false}
          isError={false}
          hasMore={false}
          skeletonCount={10}
          onLoadMore={vi.fn()}
          onClick={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('No Games Yet')).toBeInTheDocument()
    expect(screen.queryByTestId('profile-game-grid')).not.toBeInTheDocument()
  })

  it('shows error state on isError', () => {
    render(
      <MemoryRouter>
        <ProfileGamesPageUI
          {...filterProps}
          games={[]}
          isLoading={false}
          isLoadingMore={false}
          isError={true}
          hasMore={false}
          skeletonCount={10}
          onLoadMore={vi.fn()}
          onClick={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('profile-games-empty-state')).toBeInTheDocument()
  })

  it('shows skeleton cards during loading', () => {
    render(
      <MemoryRouter>
        <ProfileGamesPageUI
          {...filterProps}
          games={[]}
          isLoading={true}
          isLoadingMore={false}
          isError={false}
          hasMore={false}
          skeletonCount={6}
          onLoadMore={vi.fn()}
          onClick={vi.fn()}
        />
      </MemoryRouter>,
    )

    const skeletons = screen.getAllByTestId('profile-game-card-skeleton')
    expect(skeletons).toHaveLength(6)
  })

  it('shows Load more button when hasMore is true', () => {
    render(
      <MemoryRouter>
        <ProfileGamesPageUI
          {...filterProps}
          games={makeGames()}
          isLoading={false}
          isLoadingMore={false}
          isError={false}
          hasMore={true}
          skeletonCount={10}
          onLoadMore={vi.fn()}
          onClick={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByTestId('test-load-more-games-button-button'),
    ).toBeInTheDocument()
  })

  it('hides Load more button when hasMore is false', () => {
    render(
      <MemoryRouter>
        <ProfileGamesPageUI
          {...filterProps}
          games={makeGames()}
          isLoading={false}
          isLoadingMore={false}
          isError={false}
          hasMore={false}
          skeletonCount={10}
          onLoadMore={vi.fn()}
          onClick={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(
      screen.queryByTestId('test-load-more-games-button-button'),
    ).not.toBeInTheDocument()
  })
})
