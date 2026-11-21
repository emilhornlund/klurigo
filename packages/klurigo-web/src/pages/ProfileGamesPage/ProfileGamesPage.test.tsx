import type { PaginatedGameHistoryDto } from '@klurigo/common'
import { GameMode, GameParticipantType, GameStatus } from '@klurigo/common'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  getProfileGamesMock: vi.fn(),
  authenticateGameMock: vi.fn(),
  navigateMock: vi.fn(),
  useDeviceSizeTypeMock: vi.fn(),
}))

vi.mock('../../api', () => ({
  useKlurigoServiceClient: () => ({
    getProfileGames: h.getProfileGamesMock,
    authenticateGame: h.authenticateGameMock,
  }),
}))

vi.mock('../../utils/useDeviceSizeType', () => ({
  useDeviceSizeType: () => h.useDeviceSizeTypeMock(),
}))

vi.mock('../../context/auth', () => ({
  useAuthContext: () => ({
    isUserAuthenticated: true,
    revokeUser: vi.fn(),
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => {
      const navigate = actual.useNavigate()
      return (to: string | number) => {
        if (typeof to === 'number') navigate(to)
        else h.navigateMock(to)
      }
    },
  }
})

import type { ApiClientCore } from '../../api/api-client-core'
import { createGameResource } from '../../api/resources/game.resource'
import { DeviceType } from '../../utils/device-size.types'

import ProfileGamesPage from './ProfileGamesPage'

// Use a fixed date to avoid flaky relative-time assertions (e.g. "just now" vs "1 second ago")
const FIXED_DATE = new Date('2025-01-01T12:00:00.000Z')

const makeGame = (
  id: string,
  name: string,
  overrides?: object,
): PaginatedGameHistoryDto['results'][number] => ({
  id,
  name,
  mode: GameMode.Classic,
  status: GameStatus.Completed,
  imageCoverURL: undefined,
  participantType: GameParticipantType.PLAYER,
  rank: 1,
  score: 5000,
  created: FIXED_DATE,
  ...overrides,
})

const makePage = (
  results: PaginatedGameHistoryDto['results'],
  total: number,
  limit = 10,
  offset = 0,
): PaginatedGameHistoryDto => ({ results, total, limit, offset })

const HistoryControls = () => {
  const navigate = useNavigate()
  const { search } = useLocation()
  return (
    <>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
      <output data-testid="history-search-params">{search}</output>
    </>
  )
}

const historyParams = () =>
  new URLSearchParams(
    screen.getByTestId('history-search-params').textContent ?? '',
  )

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

const renderProfileGamesPage = (
  initialUrl = '/profile/games',
  queryClient = makeQueryClient(),
) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <ProfileGamesPage />
        <HistoryControls />
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe('ProfileGamesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Mobile)
  })

  it('renders games with card layout on initial load', async () => {
    h.getProfileGamesMock.mockResolvedValue(
      makePage([makeGame('g1', 'Game 1'), makeGame('g2', 'Game 2')], 5),
    )

    renderProfileGamesPage()

    await waitFor(() => {
      expect(screen.getByText('Game 1')).toBeInTheDocument()
    })

    expect(screen.getByText('Game 2')).toBeInTheDocument()
    expect(screen.getByTestId('profile-game-grid')).toBeInTheDocument()
    expect(h.getProfileGamesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: 'updated',
        order: 'desc',
        limit: 10,
        offset: 0,
      }),
    )
  })

  it('clicking "Load more games" triggers another API request and appends results', async () => {
    h.getProfileGamesMock.mockResolvedValueOnce(
      makePage([makeGame('g1', 'Game 1'), makeGame('g2', 'Game 2')], 5),
    )

    renderProfileGamesPage()

    await waitFor(() => {
      expect(screen.getByText('Game 1')).toBeInTheDocument()
    })

    h.getProfileGamesMock.mockResolvedValueOnce(
      makePage([makeGame('g3', 'Game 3'), makeGame('g4', 'Game 4')], 5, 10, 2),
    )

    await userEvent.click(
      screen.getByTestId('test-load-more-games-button-button'),
    )

    await waitFor(() => {
      expect(screen.getByText('Game 3')).toBeInTheDocument()
    })

    expect(screen.getByText('Game 1')).toBeInTheDocument()
    expect(screen.getByText('Game 2')).toBeInTheDocument()
    expect(screen.getByText('Game 4')).toBeInTheDocument()
    expect(h.getProfileGamesMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 2 }),
    )
  })

  it('shows the loading-more state while another page is being fetched', async () => {
    h.getProfileGamesMock.mockResolvedValueOnce(
      makePage([makeGame('g1', 'Game 1'), makeGame('g2', 'Game 2')], 5),
    )

    renderProfileGamesPage()

    await waitFor(() => {
      expect(screen.getByText('Game 1')).toBeInTheDocument()
    })

    let resolveNextPage!: (value: PaginatedGameHistoryDto) => void
    const nextPage = new Promise<PaginatedGameHistoryDto>((resolve) => {
      resolveNextPage = resolve
    })
    h.getProfileGamesMock.mockReturnValueOnce(nextPage)

    const loadMoreButton = screen.getByTestId(
      'test-load-more-games-button-button',
    )
    await userEvent.click(loadMoreButton)

    await waitFor(() => {
      expect(h.getProfileGamesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 10, offset: 2 }),
      )
    })

    expect(loadMoreButton).toBeDisabled()
    expect(screen.getByText('Game 1')).toBeInTheDocument()

    resolveNextPage(
      makePage([makeGame('g3', 'Game 3'), makeGame('g4', 'Game 4')], 5, 10, 2),
    )

    await waitFor(() => {
      expect(screen.getByText('Game 3')).toBeInTheDocument()
    })
  })

  it('"Load more games" button disappears when all games are loaded', async () => {
    h.getProfileGamesMock.mockResolvedValue(
      makePage([makeGame('g1', 'Game 1'), makeGame('g2', 'Game 2')], 2),
    )

    renderProfileGamesPage()

    await waitFor(() => {
      expect(screen.getByText('Game 1')).toBeInTheDocument()
    })

    expect(
      screen.queryByTestId('test-load-more-games-button-button'),
    ).not.toBeInTheDocument()
  })

  it('clicking an active game calls authenticateGame and navigates to /game on success', async () => {
    h.getProfileGamesMock.mockResolvedValue(
      makePage(
        [makeGame('g1', 'Active Game', { status: GameStatus.Active })],
        1,
      ),
    )
    h.authenticateGameMock.mockResolvedValue(undefined)

    renderProfileGamesPage()

    await waitFor(() => {
      expect(screen.getByText('Active Game')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('profile-game-card'))

    await waitFor(() => {
      expect(h.authenticateGameMock).toHaveBeenCalledWith({ gameId: 'g1' })
      expect(h.navigateMock).toHaveBeenCalledWith('/game')
    })
  })

  it('does not navigate when active game authentication fails', async () => {
    h.getProfileGamesMock.mockResolvedValue(
      makePage(
        [makeGame('g1', 'Active Game', { status: GameStatus.Active })],
        1,
      ),
    )
    h.authenticateGameMock.mockRejectedValue(new Error('Unauthorized'))

    renderProfileGamesPage()

    await waitFor(() => {
      expect(screen.getByText('Active Game')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('profile-game-card'))

    await waitFor(() => {
      expect(h.authenticateGameMock).toHaveBeenCalledWith({ gameId: 'g1' })
    })

    expect(h.navigateMock).not.toHaveBeenCalled()
  })

  it('clicking a completed game navigates to /game/results/{id}', async () => {
    h.getProfileGamesMock.mockResolvedValue(
      makePage([makeGame('g1', 'Completed Game')], 1),
    )

    renderProfileGamesPage()

    await waitFor(() => {
      expect(screen.getByText('Completed Game')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('profile-game-card'))

    expect(h.navigateMock).toHaveBeenCalledWith('/game/results/g1')
  })

  it('shows skeletons during initial loading state and removes them once loaded', async () => {
    let resolveLoad!: (value: PaginatedGameHistoryDto) => void
    const deferred = new Promise<PaginatedGameHistoryDto>((resolve) => {
      resolveLoad = resolve
    })
    h.getProfileGamesMock.mockReturnValue(deferred)

    renderProfileGamesPage()

    expect(screen.getAllByTestId('profile-game-card-skeleton')).toHaveLength(10)
    expect(screen.queryByTestId('profile-game-card')).not.toBeInTheDocument()

    resolveLoad(
      makePage([makeGame('g1', 'Game 1'), makeGame('g2', 'Game 2')], 2),
    )

    await waitFor(() => {
      expect(screen.getByText('Game 1')).toBeInTheDocument()
    })

    expect(
      screen.queryByTestId('profile-game-card-skeleton'),
    ).not.toBeInTheDocument()
  })

  it('uses correct pagination limit for Mobile device (10 items)', async () => {
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Mobile)
    h.getProfileGamesMock.mockResolvedValue(
      makePage([makeGame('g1', 'Game 1')], 1),
    )

    renderProfileGamesPage()

    await waitFor(() => {
      expect(screen.getByText('Game 1')).toBeInTheDocument()
    })

    expect(h.getProfileGamesMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 0 }),
    )
  })

  it('uses correct pagination limit for Tablet device (15 items)', async () => {
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Tablet)
    h.getProfileGamesMock.mockResolvedValue(
      makePage([makeGame('g1', 'Game 1')], 1),
    )

    renderProfileGamesPage()

    await waitFor(() => {
      expect(screen.getByText('Game 1')).toBeInTheDocument()
    })

    expect(h.getProfileGamesMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 15, offset: 0 }),
    )
  })

  it('uses correct pagination limit for Desktop device (20 items)', async () => {
    h.useDeviceSizeTypeMock.mockReturnValue(DeviceType.Desktop)
    h.getProfileGamesMock.mockResolvedValue(
      makePage([makeGame('g1', 'Game 1')], 1),
    )

    renderProfileGamesPage()

    await waitFor(() => {
      expect(screen.getByText('Game 1')).toBeInTheDocument()
    })

    expect(h.getProfileGamesMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
    )
  })

  it('shows error state on API failure', async () => {
    h.getProfileGamesMock.mockRejectedValue(new Error('API Error'))

    renderProfileGamesPage()

    await waitFor(() => {
      expect(
        screen.getByTestId('profile-games-empty-state'),
      ).toBeInTheDocument()
    })
  })

  it('shows empty state when no games exist', async () => {
    h.getProfileGamesMock.mockResolvedValue(makePage([], 0))

    renderProfileGamesPage()

    await waitFor(() => {
      expect(screen.getByText('No Games Yet')).toBeInTheDocument()
    })
  })

  it('stages search until submission, resets pagination, and restores search on Back and Forward', async () => {
    h.getProfileGamesMock.mockImplementation(({ search, offset }) =>
      Promise.resolve(
        search
          ? makePage([makeGame('g3', 'Science Game')], 1)
          : offset
            ? makePage([makeGame('g2', 'Another Game')], 2, 10, offset)
            : makePage([makeGame('g1', 'First Game')], 2),
      ),
    )
    renderProfileGamesPage()
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Load more games' }),
    )
    expect(await screen.findByText('Another Game')).toBeInTheDocument()

    const search = screen.getByPlaceholderText('Search')
    await user.type(search, 'Science')
    expect(h.getProfileGamesMock).toHaveBeenCalledTimes(2)
    expect(historyParams().has('search')).toBe(false)
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Science Game')).toBeInTheDocument()
    expect(screen.queryByText('Another Game')).not.toBeInTheDocument()
    expect(historyParams().get('search')).toBe('Science')
    expect(h.getProfileGamesMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Science', offset: 0 }),
    )

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByText('First Game')).toBeInTheDocument()
    expect(screen.queryByText('Another Game')).not.toBeInTheDocument()
    expect(search).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Forward' }))
    expect(await screen.findByText('Science Game')).toBeInTheDocument()
    expect(search).toHaveValue('Science')
  })

  it('reapplying a search after returning to Game History starts at page one with the same query cache', async () => {
    h.getProfileGamesMock.mockImplementation(({ search, offset }) =>
      Promise.resolve(
        search
          ? makePage(
              [makeGame(`science-${offset}`, `Science Game ${offset + 1}`)],
              2,
              10,
              offset,
            )
          : makePage([makeGame('g1', 'First Game')], 1),
      ),
    )
    const user = userEvent.setup()
    const submitSearch = async () => {
      await user.type(screen.getByPlaceholderText('Search'), 'Science')
      await user.click(screen.getByRole('button', { name: 'Search games' }))
      expect(await screen.findByText('Science Game 1')).toBeInTheDocument()
    }
    const queryClient = makeQueryClient()
    const page = renderProfileGamesPage('/profile/games', queryClient)
    await screen.findByText('First Game')
    await submitSearch()
    await user.click(
      await screen.findByRole('button', { name: 'Load more games' }),
    )
    expect(await screen.findByText('Science Game 2')).toBeInTheDocument()
    page.unmount()

    renderProfileGamesPage('/profile/games', queryClient)
    await screen.findByText('First Game')
    h.getProfileGamesMock.mockClear()
    await submitSearch()

    expect(h.getProfileGamesMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ search: 'Science', limit: 10, offset: 0 }),
    )
    expect(screen.queryByText('Science Game 2')).not.toBeInTheDocument()
  })

  it('applies combined filters and sorting, and retains them when loading more or reopening the URL', async () => {
    h.getProfileGamesMock.mockImplementation(({ offset }) =>
      Promise.resolve(
        makePage(
          [makeGame(`g${offset}`, offset ? 'Second game' : 'First game')],
          2,
          10,
          offset,
        ),
      ),
    )
    const page = renderProfileGamesPage()
    const user = userEvent.setup()
    await screen.findByText('First game')
    await user.type(screen.getByPlaceholderText('Search'), 'game')
    await user.click(screen.getByRole('button', { name: 'Open filters' }))
    const select = (name: string) => screen.getByRole('combobox', { name })
    expect(select('Sort By')).toHaveValue('updated')
    expect(select('Sort Order')).toHaveValue('desc')
    expect(screen.queryByText('Category')).not.toBeInTheDocument()
    await user.selectOptions(select('Participation'), 'Hosted')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(h.getProfileGamesMock).toHaveBeenCalledTimes(1)
    expect(historyParams().has('participantType')).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Open filters' }))
    expect(select('Participation')).toHaveValue(GameParticipantType.HOST)
    await user.selectOptions(select('Participation'), 'Played')
    await user.selectOptions(select('Game Mode'), GameMode.Classic)
    await user.selectOptions(select('Status'), 'Ongoing')
    await user.selectOptions(select('Sort By'), 'Name')
    await user.selectOptions(select('Sort Order'), 'Ascending')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    const applied = {
      search: 'game',
      participantType: GameParticipantType.PLAYER,
      mode: GameMode.Classic,
      status: GameStatus.Active,
      sort: 'name',
      order: 'asc',
    }
    expect(Object.fromEntries(historyParams())).toEqual(applied)
    await waitFor(() =>
      expect(h.getProfileGamesMock).toHaveBeenLastCalledWith({
        ...applied,
        limit: 10,
        offset: 0,
      }),
    )
    await user.click(
      await screen.findByRole('button', { name: 'Load more games' }),
    )
    expect(await screen.findByText('Second game')).toBeInTheDocument()
    expect(h.getProfileGamesMock).toHaveBeenLastCalledWith({
      ...applied,
      limit: 10,
      offset: 1,
    })
    expect(Object.fromEntries(historyParams())).toEqual(applied)

    const url = `/profile/games?${historyParams()}`
    page.unmount()
    renderProfileGamesPage(url)
    await screen.findByText('First game')
    expect(screen.getByPlaceholderText('Search')).toHaveValue('game')
    expect(h.getProfileGamesMock).toHaveBeenLastCalledWith({
      ...applied,
      limit: 10,
      offset: 0,
    })
    await user.click(screen.getByRole('button', { name: 'Open filters' }))
    expect(select('Status')).toHaveValue(GameStatus.Active)
    expect(select('Sort By')).toHaveValue('name')
  })

  it('uses supported defaults when URL options are invalid', async () => {
    h.getProfileGamesMock.mockResolvedValue(
      makePage([makeGame('g1', 'First Game')], 1),
    )
    renderProfileGamesPage(
      '/profile/games?participantType=other&mode=unknown&status=unknown&sort=title&order=up',
    )

    expect(await screen.findByText('First Game')).toBeInTheDocument()
    expect(h.getProfileGamesMock).toHaveBeenLastCalledWith({
      participantType: undefined,
      mode: undefined,
      status: undefined,
      sort: 'updated',
      order: 'desc',
      limit: 10,
      offset: 0,
    })
  })

  it('keeps search controls available when a search finds no matching games', async () => {
    const notifyError = vi.fn()
    const apiGet = vi.fn((path: string) => {
      const { searchParams } = new URL(path, 'https://example.test')
      if (Number(searchParams.get('limit')) < 5) {
        return Promise.reject(new Error('Invalid game history limit'))
      }
      return Promise.resolve(
        searchParams.has('search')
          ? makePage([], 0)
          : makePage([makeGame('g1', 'First Game')], 1),
      )
    })
    const { getProfileGames } = createGameResource(
      { apiGet } as unknown as ApiClientCore,
      { notifyError, notifySuccess: vi.fn() },
    )
    h.getProfileGamesMock.mockImplementation(getProfileGames)
    renderProfileGamesPage()
    const user = userEvent.setup()
    await screen.findByText('First Game')
    await user.type(screen.getByPlaceholderText('Search'), 'No matches')
    await user.click(screen.getByRole('button', { name: 'Search games' }))

    expect(await screen.findByText(/No matching games/)).toBeInTheDocument()
    expect(h.getProfileGamesMock).toHaveBeenLastCalledWith({
      limit: 5,
      offset: 0,
    })
    expect(notifyError).not.toHaveBeenCalled()
    expect(screen.queryByText('No Games Yet')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open filters' })).toBeEnabled()
    await user.clear(screen.getByPlaceholderText('Search'))
    await user.click(screen.getByRole('button', { name: 'Search games' }))
    expect(await screen.findByText('First Game')).toBeInTheDocument()
    expect(historyParams().has('search')).toBe(false)
  })

  it('shows No Games Yet when a filtered URL is opened without any history', async () => {
    h.getProfileGamesMock.mockResolvedValue(makePage([], 0))
    renderProfileGamesPage('/profile/games?search=quiz')

    expect(await screen.findByText('No Games Yet')).toBeInTheDocument()
    expect(h.getProfileGamesMock).toHaveBeenLastCalledWith({
      limit: 5,
      offset: 0,
    })
  })
})
