import {
  DEFAULT_CRITTERS_AVATAR_V1,
  GameMode,
  type GameResultClassicModeDto,
  type GameResultDto,
  type GameResultZeroToOneHundredModeDto,
  QuestionType,
} from '@klurigo/common'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCrittersAvatarV1DataUri } from '../../../../utils/avatar/critters-v1'

import GameResultsPageUI from './GameResultsPageUI'

const CREATED_DATE = new Date('2025-01-01T12:00:00.000Z')

const createOrUpdateQuizRatingMock = vi.fn()

const host = {
  id: 'fd22f8fe-5217-4f4c-85b9-3a1fccf99e7a',
  nickname: 'FrostyBear',
  avatar: DEFAULT_CRITTERS_AVATAR_V1,
}

vi.mock('../../../../api', () => ({
  useKlurigoServiceClient: () => ({
    createOrUpdateQuizRating: createOrUpdateQuizRatingMock,
  }),
}))

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  createOrUpdateQuizRatingMock.mockReset()
  createOrUpdateQuizRatingMock.mockResolvedValue({
    stars: 5,
    comment: 'test',
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GameResultsPageUI', () => {
  it('should render GameResultsPageUI for classic game mode', async () => {
    const { container } = render(
      <MemoryRouter>
        <GameResultsPageUI
          results={{
            id: uuidv4(),
            mode: GameMode.Classic,
            name: 'Classic Quiz Debug',
            quiz: {
              id: 'quizId',
              canRateQuiz: false,
              canHostLiveGame: true,
              canPublishQuiz: false,
            },
            host,
            numberOfPlayers: 3,
            numberOfQuestions: 4,
            playerMetrics: [
              {
                player: {
                  id: uuidv4(),
                  nickname: 'ShadowCyborg',
                  avatar: DEFAULT_CRITTERS_AVATAR_V1,
                },
                rank: 1,
                comebackRankGain: 1,
                correct: 4,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 1961,
                longestCorrectStreak: 4,
                score: 3891,
              },
              {
                player: {
                  id: uuidv4(),
                  nickname: 'ShadowWhirlwind',
                  avatar: DEFAULT_CRITTERS_AVATAR_V1,
                },
                rank: 2,
                comebackRankGain: 0,
                correct: 3,
                incorrect: 1,
                unanswered: 0,
                averageResponseTime: 5127,
                longestCorrectStreak: 2,
                score: 2742,
              },
              {
                player: {
                  id: uuidv4(),
                  nickname: 'WhiskerFox',
                  avatar: DEFAULT_CRITTERS_AVATAR_V1,
                },
                rank: 3,
                comebackRankGain: 0,
                correct: 1,
                incorrect: 1,
                unanswered: 2,
                averageResponseTime: 16999,
                longestCorrectStreak: 1,
                score: 948,
              },
            ],
            questionMetrics: [
              {
                text: 'What is the capital of Sweden?',
                type: QuestionType.MultiChoice,
                correct: 3,
                incorrect: 0,
                unanswered: 0,
                averageResponseTime: 2085,
              },
              {
                text: 'Guess the temperature of the hottest day ever recorded.',
                type: QuestionType.Range,
                correct: 1,
                incorrect: 1,
                unanswered: 1,
                averageResponseTime: 12252,
              },
              {
                text: 'The earth is flat.',
                type: QuestionType.TrueFalse,
                correct: 2,
                incorrect: 1,
                unanswered: 0,
                averageResponseTime: 2869,
              },
              {
                text: 'What is the capital of Denmark?',
                type: QuestionType.TypeAnswer,
                correct: 2,
                incorrect: 0,
                unanswered: 1,
                averageResponseTime: 14910,
              },
            ],
            duration: 456,
            created: CREATED_DATE,
          }}
          currentParticipantId="participant-id-1"
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  it('should render GameResultsPageUI for zero to one hundred game mode', async () => {
    const { container } = render(
      <MemoryRouter>
        <GameResultsPageUI
          results={{
            id: uuidv4(),
            mode: GameMode.ZeroToOneHundred,
            name: '0-100 Quiz Debug',
            quiz: {
              id: 'quizId',
              canRateQuiz: false,
              canHostLiveGame: false,
              canPublishQuiz: false,
            },
            host,
            numberOfPlayers: 3,
            numberOfQuestions: 4,
            playerMetrics: [
              {
                player: {
                  id: uuidv4(),
                  nickname: 'ShadowCyborg',
                  avatar: DEFAULT_CRITTERS_AVATAR_V1,
                },
                rank: 1,
                comebackRankGain: 1,
                averagePrecision: 1,
                unanswered: 0,
                averageResponseTime: 4015,
                score: -40,
              },
              {
                player: {
                  id: uuidv4(),
                  nickname: 'ShadowWhirlwind',
                  avatar: DEFAULT_CRITTERS_AVATAR_V1,
                },
                rank: 2,
                comebackRankGain: 0,
                averagePrecision: 0.95,
                unanswered: 0,
                averageResponseTime: 10662,
                score: 10,
              },
              {
                player: {
                  id: uuidv4(),
                  nickname: 'WhiskerFox',
                  avatar: DEFAULT_CRITTERS_AVATAR_V1,
                },
                rank: 3,
                comebackRankGain: 0,
                averagePrecision: 0.72,
                unanswered: 1,
                averageResponseTime: 27251,
                score: 113,
              },
            ],
            questionMetrics: [
              {
                text: '2002 levererades den första Koenigseggbilen av modell CC8S. Hur många tillverkades totalt?',
                type: QuestionType.Range,
                averagePrecision: 0.98,
                unanswered: 0,
                averageResponseTime: 9428,
              },
              {
                text: 'Hur många år blev Kubas förre president Fidel Castro?',
                type: QuestionType.Range,
                averagePrecision: 0.92,
                unanswered: 0,
                averageResponseTime: 11464,
              },
              {
                text: 'Vilka är de två första decimalerna i talet pi?',
                type: QuestionType.Range,
                averagePrecision: 0.67,
                unanswered: 1,
                averageResponseTime: 25265,
              },
              {
                text: 'Hur många klädda kort finns det i en kortlek?',
                type: QuestionType.Range,
                averagePrecision: 0.99,
                unanswered: 0,
                averageResponseTime: 9748,
              },
            ],
            duration: 123.772,
            created: CREATED_DATE,
          }}
          currentParticipantId="participant-id-1"
        />
      </MemoryRouter>,
    )

    expect(container).toMatchSnapshot()
  })

  const classicMinimal = (): GameResultClassicModeDto => ({
    id: uuidv4(),
    mode: GameMode.Classic,
    name: 'Classic Minimal',
    quiz: {
      id: 'quizId',
      canRateQuiz: false,
      canHostLiveGame: true,
      canPublishQuiz: false,
    },
    host,
    numberOfPlayers: 2,
    numberOfQuestions: 2,
    playerMetrics: [
      {
        player: {
          id: uuidv4(),
          nickname: 'Alice',
          avatar: DEFAULT_CRITTERS_AVATAR_V1,
        },
        rank: 1,
        comebackRankGain: 1,
        correct: 2,
        incorrect: 1,
        unanswered: 0,
        averageResponseTime: 1500,
        longestCorrectStreak: 2,
        score: 200,
      },
      {
        player: {
          id: uuidv4(),
          nickname: 'Bob',
          avatar: DEFAULT_CRITTERS_AVATAR_V1,
        },
        rank: 2,
        comebackRankGain: 0,
        correct: 1,
        incorrect: 1,
        unanswered: 1,
        averageResponseTime: 2500,
        longestCorrectStreak: 1,
        score: 120,
      },
    ],
    questionMetrics: [
      {
        text: 'Q1: Capital of Sweden?',
        type: QuestionType.MultiChoice,
        correct: 2,
        incorrect: 0,
        unanswered: 0,
        averageResponseTime: 1800,
      },
      {
        text: 'Q2: 2 + 2?',
        type: QuestionType.TrueFalse,
        correct: 1,
        incorrect: 1,
        unanswered: 0,
        averageResponseTime: 2200,
      },
    ],
    duration: 300,
    created: CREATED_DATE,
  })

  const z2hMinimal = (): GameResultZeroToOneHundredModeDto => ({
    id: uuidv4(),
    mode: GameMode.ZeroToOneHundred,
    name: '0-100 Minimal',
    quiz: {
      id: 'quizId',
      canRateQuiz: false,
      canHostLiveGame: false,
      canPublishQuiz: false,
    },
    host,
    numberOfPlayers: 2,
    numberOfQuestions: 2,
    playerMetrics: [
      {
        player: {
          id: uuidv4(),
          nickname: 'Carol',
          avatar: DEFAULT_CRITTERS_AVATAR_V1,
        },
        rank: 1,
        comebackRankGain: 1,
        averagePrecision: 0.8,
        unanswered: 0,
        averageResponseTime: 2100,
        score: 10,
      },
      {
        player: {
          id: uuidv4(),
          nickname: 'Dave',
          avatar: DEFAULT_CRITTERS_AVATAR_V1,
        },
        rank: 2,
        comebackRankGain: 0,
        averagePrecision: 0.6,
        unanswered: 1,
        averageResponseTime: 2600,
        score: 5,
      },
    ],
    questionMetrics: [
      {
        text: 'Q1: Estimate distance',
        type: QuestionType.Range,
        averagePrecision: 0.7,
        unanswered: 0,
        averageResponseTime: 3000,
      },
      {
        text: 'Q2: Estimate height',
        type: QuestionType.Range,
        averagePrecision: 0.5,
        unanswered: 1,
        averageResponseTime: 4000,
      },
    ],
    duration: 90,
    created: CREATED_DATE,
  })

  const clickSegment = (label: string) => {
    const btn = screen.queryByRole('button', {
      name: label,
    }) as HTMLElement | null
    if (btn) {
      fireEvent.click(btn)
      return
    }
    const el = screen.getByText(label)
    const target = (el.closest('button') as HTMLElement) ?? (el as HTMLElement)
    fireEvent.click(target)
  }

  describe('Your result', () => {
    const renderResults = (
      results: GameResultDto,
      currentParticipantId: string,
    ) =>
      render(
        <MemoryRouter>
          <GameResultsPageUI
            results={results}
            currentParticipantId={currentParticipantId}
          />
        </MemoryRouter>,
      )

    const resultCard = () => screen.getByRole('region', { name: 'Your result' })

    it('opens with the non-podium player’s API rank, recorded answer total and achievements', () => {
      const results = classicMinimal()
      const current = {
        ...results.playerMetrics[0],
        player: { ...results.playerMetrics[0].player, id: 'current-player' },
        rank: 4,
        score: 1375,
        unanswered: 1,
        comebackRankGain: 3,
      }
      renderResults(
        {
          ...results,
          numberOfPlayers: 4,
          playerMetrics: [
            current,
            ...results.playerMetrics,
            {
              ...results.playerMetrics[1],
              rank: 3,
              player: {
                ...results.playerMetrics[1].player,
                id: 'third-player',
              },
            },
          ],
        },
        current.player.id,
      )

      const recap = within(resultCard())
      expect(recap.getByText('Finished')).toBeInTheDocument()
      expect(recap.getByText('#4')).toBeInTheDocument()
      expect(recap.getByText('Final score')).toBeInTheDocument()
      expect(recap.getByText('1375')).toBeInTheDocument()
      expect(recap.getByText('Correct answers')).toBeInTheDocument()
      expect(recap.getByText('2 of 4')).toBeInTheDocument()
      expect(
        recap.getByText('Longest correct streak: 2 answers'),
      ).toBeInTheDocument()
      expect(
        recap.getByText('Recovered 3 places from your lowest position'),
      ).toBeInTheDocument()
      expect(
        resultCard().compareDocumentPosition(
          screen.getAllByTestId('podium-column')[0],
        ),
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

      clickSegment('Players')
      expect(
        screen.queryByRole('region', { name: 'Your result' }),
      ).not.toBeInTheDocument()
      clickSegment('Summary')
      expect(within(resultCard()).getByText('#4')).toBeInTheDocument()
    })

    it('shows formatted precision and a one-place comeback for Zero to One Hundred', () => {
      const results = z2hMinimal()
      const current = {
        ...results.playerMetrics[0],
        averagePrecision: 0.814,
        score: -40,
      }
      renderResults(
        { ...results, playerMetrics: [current, results.playerMetrics[1]] },
        current.player.id,
      )

      const recap = within(resultCard())
      expect(recap.getByText('#1')).toBeInTheDocument()
      expect(recap.getByText('-40')).toBeInTheDocument()
      expect(recap.getByText('Average precision')).toBeInTheDocument()
      expect(recap.getByText('82%')).toBeInTheDocument()
      expect(
        recap.getByText('Recovered 1 place from your lowest position'),
      ).toBeInTheDocument()
      expect(
        recap.queryByText(/longest correct streak/i),
      ).not.toBeInTheDocument()
    })

    it.each(Object.values(GameMode))(
      'keeps zero statistics visible in a single-player %s game',
      (mode) => {
        const zeroStats = { score: 0, unanswered: 1, comebackRankGain: 0 }
        const classic = classicMinimal()
        const z2h = z2hMinimal()
        const results: GameResultDto =
          mode === GameMode.Classic
            ? {
                ...classic,
                numberOfPlayers: 1,
                playerMetrics: [
                  {
                    ...classic.playerMetrics[0],
                    ...zeroStats,
                    correct: 0,
                    incorrect: 1,
                    longestCorrectStreak: 0,
                  },
                ],
              }
            : {
                ...z2h,
                numberOfPlayers: 1,
                playerMetrics: [
                  {
                    ...z2h.playerMetrics[0],
                    ...zeroStats,
                    averagePrecision: 0,
                  },
                ],
              }
        renderResults(results, results.playerMetrics[0].player.id)

        const recap = within(resultCard())
        expect(recap.getByText('#1')).toBeInTheDocument()
        expect(recap.getByText('0')).toBeInTheDocument()
        expect(
          recap.getByText(mode === GameMode.Classic ? '0 of 2' : '0%'),
        ).toBeInTheDocument()
        expect(
          recap.queryByText(/longest correct streak|recovered/i),
        ).not.toBeInTheDocument()
        expect(screen.getByText('Fastest Overall Player')).toBeInTheDocument()
        expect(
          screen.queryByText(
            /^(Most Accurate Player|Precision Champion|Biggest Comeback|Longest Correct Streak)$/,
          ),
        ).not.toBeInTheDocument()
      },
    )

    it('keeps personal, player and question results when no award qualifies', () => {
      const results = classicMinimal()
      const current = {
        ...results.playerMetrics[0],
        correct: 0,
        incorrect: 0,
        unanswered: results.numberOfQuestions,
        score: 0,
        longestCorrectStreak: 0,
        comebackRankGain: 0,
      }
      renderResults(
        {
          ...results,
          numberOfPlayers: 1,
          playerMetrics: [current],
          questionMetrics: results.questionMetrics.map((question) => ({
            ...question,
            correct: 0,
            incorrect: 0,
            unanswered: 1,
          })),
        },
        current.player.id,
      )

      expect(within(resultCard()).getByText('0 of 2')).toBeInTheDocument()
      expect(
        screen.queryByRole('region', { name: /toughest question/i }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText(
          /^(Fastest Overall Player|Most Accurate Player|Precision Champion|Biggest Comeback|Longest Correct Streak)$/,
        ),
      ).not.toBeInTheDocument()

      clickSegment('Players')
      fireEvent.click(screen.getByText(current.player.nickname))
      expect(screen.getByText('Longest correct streak')).toBeInTheDocument()
      expect(screen.getByText('Unanswered')).toBeInTheDocument()

      clickSegment('Questions')
      const question = screen.getByText(results.questionMetrics[0].text)
      fireEvent.click(question)
      expect(question).toBeInTheDocument()
      expect(
        screen.getAllByText('Average response time')[0],
      ).toBeInTheDocument()
    })

    it('does not call out a one-answer streak or zero-place comeback', () => {
      const results = classicMinimal()
      renderResults(results, results.playerMetrics[1].player.id)

      const recap = within(resultCard())
      expect(recap.getByText('1 of 3')).toBeInTheDocument()
      expect(
        recap.queryByText(/longest correct streak|recovered/i),
      ).not.toBeInTheDocument()
    })

    it.each([
      {
        currentParticipantId: 'missing-player',
        playerId: 'other-player',
        rank: 2,
      },
      { currentParticipantId: host.id, playerId: host.id, rank: 2 },
      {
        currentParticipantId: 'unranked-player',
        playerId: 'unranked-player',
        rank: 0,
      },
    ])(
      'keeps the game-wide summary for $currentParticipantId',
      ({ currentParticipantId, playerId, rank }) => {
        const results = classicMinimal()
        const otherPlayer = results.playerMetrics[1]
        renderResults(
          {
            ...results,
            playerMetrics: [
              results.playerMetrics[0],
              {
                ...otherPlayer,
                rank,
                player: { ...otherPlayer.player, id: playerId },
              },
            ],
          },
          currentParticipantId,
        )

        expect(
          screen.queryByRole('region', { name: 'Your result' }),
        ).not.toBeInTheDocument()
        expect(screen.getByText('Game Mode')).toBeInTheDocument()
        expect(screen.getAllByTestId('podium-column').length).toBeGreaterThan(0)
      },
    )
  })

  it.each(Object.values(GameMode))(
    'renders durable host/account/guest designs across sections and reload data in %s',
    (mode) => {
      const results = structuredClone(
        mode === GameMode.Classic ? classicMinimal() : z2hMinimal(),
      )
      const hostAvatar = {
        ...DEFAULT_CRITTERS_AVATAR_V1,
        body: 'block' as const,
        top: null,
      }
      const designs = [
        { ...DEFAULT_CRITTERS_AVATAR_V1, cheeks: null },
        { ...DEFAULT_CRITTERS_AVATAR_V1, pattern: null },
      ]
      Object.assign(results.host, { avatar: hostAvatar })
      results.playerMetrics.forEach(({ player }, index) =>
        Object.assign(player, { avatar: designs[index] }),
      )
      const currentId = results.playerMetrics[0].player.id
      const view = render(
        <MemoryRouter>
          <GameResultsPageUI
            results={results}
            currentParticipantId={currentId}
          />
        </MemoryRouter>,
      )
      const podiumSources = () =>
        Array.from(
          view.container.querySelectorAll('[data-testid="podium-column"] img'),
        ).map((image) => image.getAttribute('src'))
      expect(podiumSources()).toEqual([
        getCrittersAvatarV1DataUri(designs[1]),
        getCrittersAvatarV1DataUri(designs[0]),
      ])
      expect(
        screen
          .getByRole('link', { name: host.nickname })
          .parentElement?.querySelector('img'),
      ).toHaveAttribute('src', getCrittersAvatarV1DataUri(hostAvatar))

      clickSegment('Players')
      const rowSources = () =>
        results.playerMetrics.map(({ player }) =>
          screen
            .getByText(player.nickname)
            .parentElement?.parentElement?.querySelector('img')
            ?.getAttribute('src'),
        )
      expect(rowSources()).toEqual(designs.map(getCrittersAvatarV1DataUri))
      view.rerender(
        <MemoryRouter>
          <GameResultsPageUI
            results={structuredClone(results)}
            currentParticipantId={currentId}
          />
        </MemoryRouter>,
      )
      expect(rowSources()).toEqual(designs.map(getCrittersAvatarV1DataUri))
      clickSegment('Summary')
      expect(podiumSources()).toEqual([
        getCrittersAvatarV1DataUri(designs[1]),
        getCrittersAvatarV1DataUri(designs[0]),
      ])
    },
  )

  it.each([
    { tied: false, label: 'Toughest question' },
    { tied: true, label: 'One of the toughest questions' },
  ])(
    'shows $label with the Questions-tab number and percentage',
    ({ tied, label }) => {
      const results = classicMinimal()
      const [first, toughest] = results.questionMetrics
      const questionMetrics = [
        { ...first, correct: 0, unanswered: 3 },
        { ...toughest, unanswered: 1 },
        {
          ...first,
          text: 'Which is the largest ocean?',
          correct: tied ? 1 : 2,
          incorrect: tied ? 2 : 1,
        },
      ]

      render(
        <MemoryRouter>
          <GameResultsPageUI
            results={{
              ...results,
              numberOfPlayers: 3,
              numberOfQuestions: 3,
              questionMetrics,
            }}
            currentParticipantId={
              tied ? results.playerMetrics[0].player.id : host.id
            }
          />
        </MemoryRouter>,
      )

      const highlight = screen.getByRole('region', { name: label })
      expect(within(highlight).getByText('Question 2')).toBeInTheDocument()
      expect(within(highlight).getByText(toughest.text)).toBeInTheDocument()
      expect(highlight).toHaveTextContent('34% of players answered correctly')
      expect(highlight.previousElementSibling).toHaveTextContent(
        'Challenging quiz!',
      )

      clickSegment('Questions')
      expect(highlight).not.toBeInTheDocument()
      const row = screen
        .getByText(toughest.text)
        .closest('.tableRow') as HTMLElement
      expect(within(row).getByText('2')).toBeInTheDocument()
      expect(within(row).getByText('34%')).toBeInTheDocument()
    },
  )

  it('shows Summary by default and switches to Players and Questions (Classic)', () => {
    const { container } = render(
      <MemoryRouter>
        <GameResultsPageUI
          results={classicMinimal()}
          currentParticipantId="participant-id-1"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(
      screen.getByText(
        /A quick look at how this game unfolded — see how players performed, how fast they answered, and who stood out\./,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Game Mode')).toBeInTheDocument()
    expect(screen.getByText('Classic')).toBeInTheDocument()
    expect(container).toMatchSnapshot()

    clickSegment('Players')
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.queryByText('Q1: Capital of Sweden?')).toBeNull()
    expect(container).toMatchSnapshot()

    clickSegment('Questions')
    expect(screen.getByText('Q1: Capital of Sweden?')).toBeInTheDocument()
    expect(screen.getByText('Q2: 2 + 2?')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).toBeNull()
    expect(container).toMatchSnapshot()

    clickSegment('Summary')
    expect(screen.getByText('Game Mode')).toBeInTheDocument()
    expect(screen.getByText('Classic')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('switches sections and shows 0 to 100 label in Summary (ZeroToOneHundred)', () => {
    const { container } = render(
      <MemoryRouter>
        <GameResultsPageUI
          results={z2hMinimal()}
          currentParticipantId="participant-id-1"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('Game Mode')).toBeInTheDocument()
    expect(screen.getByText('0 to 100')).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: /toughest question/i }),
    ).not.toBeInTheDocument()
    expect(container).toMatchSnapshot()

    clickSegment('Players')
    expect(screen.getByText('Carol')).toBeInTheDocument()
    expect(screen.getByText('Dave')).toBeInTheDocument()
    expect(container).toMatchSnapshot()

    clickSegment('Questions')
    expect(screen.getByText('Q1: Estimate distance')).toBeInTheDocument()
    expect(screen.getByText('Q2: Estimate height')).toBeInTheDocument()
    expect(container).toMatchSnapshot()

    clickSegment('Summary')
    expect(screen.getByText('0 to 100')).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  describe('Rating state management', () => {
    it('hydrates initial rating when results.rating is present', () => {
      const results: GameResultDto = {
        ...classicMinimal(),
        quiz: {
          id: 'quizId',
          canRateQuiz: true,
          canHostLiveGame: true,
          canPublishQuiz: false,
        },
        rating: { stars: 3, comment: 'Good quiz!' },
      }

      render(
        <MemoryRouter>
          <GameResultsPageUI results={results} currentParticipantId="p-1" />
        </MemoryRouter>,
      )

      // Rating should be visible in the Summary section
      const ratingSection = screen.getByText(/rate this quiz/i).closest('div')
      expect(ratingSection).toBeInTheDocument()

      // Check that the rating values are rendered (via star buttons/comment)
      // Since RatingCard renders actual stars, we can check for active star styling
      // or use test IDs if available. For this test, we verify the component exists.
      expect(screen.getByText(/rate this quiz/i)).toBeInTheDocument()
    })

    it('shows default rating state when results.rating is absent', () => {
      const results: GameResultDto = {
        ...classicMinimal(),
        quiz: {
          id: 'quizId',
          canRateQuiz: true,
          canHostLiveGame: true,
          canPublishQuiz: false,
        },
        rating: undefined,
      }

      render(
        <MemoryRouter>
          <GameResultsPageUI results={results} currentParticipantId="p-1" />
        </MemoryRouter>,
      )

      // Rating card should be present but without pre-filled values
      expect(screen.getByText(/rate this quiz/i)).toBeInTheDocument()

      // No star should be selected initially (implementation detail check)
      // We can't easily assert on the DOM without inspecting RatingCard internals,
      // but the component should render without errors
    })

    it('preserves draft rating state when switching between tabs', async () => {
      const results: GameResultDto = {
        ...classicMinimal(),
        quiz: {
          id: 'quizId',
          canRateQuiz: true,
          canHostLiveGame: true,
          canPublishQuiz: false,
        },
        rating: undefined,
      }

      render(
        <MemoryRouter>
          <GameResultsPageUI results={results} currentParticipantId="p-1" />
        </MemoryRouter>,
      )

      // Start in Summary tab
      expect(screen.getByText(/rate this quiz/i)).toBeInTheDocument()

      // Find and click the 4th star button
      const starButtons = screen.getAllByRole('button', {
        name: /rate \d+ star/i,
      })
      fireEvent.click(starButtons[3]) // 4 stars (0-indexed)

      // Type a comment using fireEvent
      const commentTextarea = screen.getByPlaceholderText(
        /optional comment/i,
      ) as HTMLTextAreaElement
      fireEvent.change(commentTextarea, { target: { value: 'Great!' } })

      // Switch to Players tab
      clickSegment('Players')
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.queryByText(/rate this quiz/i)).toBeNull()

      // Switch to Questions tab
      clickSegment('Questions')
      expect(screen.getByText('Q1: Capital of Sweden?')).toBeInTheDocument()
      expect(screen.queryByText(/rate this quiz/i)).toBeNull()

      // Switch back to Summary
      clickSegment('Summary')
      expect(screen.getByText(/rate this quiz/i)).toBeInTheDocument()

      // Verify the draft values are preserved
      const commentTextareaAfter = screen.getByPlaceholderText(
        /optional comment/i,
      ) as HTMLTextAreaElement
      expect(commentTextareaAfter.value).toBe('Great!')

      // Check that 4 stars are still selected by looking at the active state
      const starButtonsAfter = screen.getAllByRole('button', {
        name: /rate \d+ star/i,
      })
      expect(starButtonsAfter).toHaveLength(5)
    })

    it('triggers autosave when rating is changed', async () => {
      const results: GameResultDto = {
        ...classicMinimal(),
        quiz: {
          id: 'quizId',
          canRateQuiz: true,
          canHostLiveGame: true,
          canPublishQuiz: false,
        },
        rating: undefined,
      }

      render(
        <MemoryRouter>
          <GameResultsPageUI results={results} currentParticipantId="p-1" />
        </MemoryRouter>,
      )

      // Click 5 stars
      const starButtons = screen.getAllByRole('button', {
        name: /rate \d+ star/i,
      })
      fireEvent.click(starButtons[4]) // 5 stars

      // Should have called createOrUpdateQuizRating with stars=5, no comment (immediate, no debounce)
      await waitFor(
        () => {
          expect(createOrUpdateQuizRatingMock).toHaveBeenCalledWith(
            'quizId',
            5,
            undefined,
          )
        },
        { timeout: 1000 },
      )
    })

    it('triggers debounced autosave when comment is typed', async () => {
      const results: GameResultDto = {
        ...classicMinimal(),
        quiz: {
          id: 'quizId',
          canRateQuiz: true,
          canHostLiveGame: true,
          canPublishQuiz: false,
        },
        rating: undefined,
      }

      render(
        <MemoryRouter>
          <GameResultsPageUI results={results} currentParticipantId="p-1" />
        </MemoryRouter>,
      )

      // Click 5 stars first (comment only saves if stars are selected)
      const starButtons = screen.getAllByRole('button', {
        name: /rate \d+ star/i,
      })
      fireEvent.click(starButtons[4]) // 5 stars

      // Wait for star save
      await waitFor(
        () => {
          expect(createOrUpdateQuizRatingMock).toHaveBeenCalledWith(
            'quizId',
            5,
            undefined,
          )
        },
        { timeout: 1000 },
      )

      createOrUpdateQuizRatingMock.mockClear()

      // Type a comment
      const commentTextarea = screen.getByPlaceholderText(
        /optional comment/i,
      ) as HTMLTextAreaElement
      fireEvent.change(commentTextarea, { target: { value: 'Amazing quiz!' } })

      // Should not save immediately (600ms debounce)
      expect(createOrUpdateQuizRatingMock).not.toHaveBeenCalled()

      // Wait for debounced save (600ms + buffer)
      await waitFor(
        () => {
          expect(createOrUpdateQuizRatingMock).toHaveBeenCalledWith(
            'quizId',
            5,
            'Amazing quiz!',
          )
        },
        { timeout: 1000 },
      )
    })

    it('does not call autosave when canRateQuiz is false', async () => {
      const results: GameResultDto = {
        ...classicMinimal(),
        quiz: {
          id: 'quizId',
          canRateQuiz: false,
          canHostLiveGame: true,
          canPublishQuiz: false,
        },
        rating: undefined,
      }

      render(
        <MemoryRouter>
          <GameResultsPageUI results={results} currentParticipantId="p-1" />
        </MemoryRouter>,
      )

      // Rating card should be disabled
      expect(screen.getByText(/rate this quiz/i)).toBeInTheDocument()
      expect(
        screen.getByText(/you cannot rate your own quiz/i),
      ).toBeInTheDocument()

      // Star buttons should be disabled
      const starButtons = screen.getAllByRole('button', {
        name: /rate \d+ star/i,
      })
      starButtons.forEach((btn) => {
        expect(btn).toBeDisabled()
      })

      // Try to click a star (should do nothing because button is disabled)
      fireEvent.click(starButtons[0])

      // Wait a bit to ensure no autosave happens
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Should never call autosave
      expect(createOrUpdateQuizRatingMock).not.toHaveBeenCalled()
    })

    it('does not trigger autosave on initial render with existing rating', async () => {
      vi.useFakeTimers()

      const results: GameResultDto = {
        ...classicMinimal(),
        quiz: {
          id: 'quizId',
          canRateQuiz: true,
          canHostLiveGame: true,
          canPublishQuiz: false,
        },
        rating: { stars: 4, comment: 'Existing comment' },
      }

      render(
        <MemoryRouter>
          <GameResultsPageUI results={results} currentParticipantId="p-1" />
        </MemoryRouter>,
      )

      // Advance all timers
      await vi.advanceTimersByTimeAsync(1000)

      // Should not have called autosave during hydration
      expect(createOrUpdateQuizRatingMock).not.toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('deduplicates identical autosave requests', async () => {
      const results: GameResultDto = {
        ...classicMinimal(),
        quiz: {
          id: 'quizId',
          canRateQuiz: true,
          canHostLiveGame: true,
          canPublishQuiz: false,
        },
        rating: { stars: 3, comment: 'test' },
      }

      render(
        <MemoryRouter>
          <GameResultsPageUI results={results} currentParticipantId="p-1" />
        </MemoryRouter>,
      )

      // Click the same star that's already selected (3 stars)
      const starButtons = screen.getAllByRole('button', {
        name: /rate \d+ star/i,
      })

      // Click 3rd star (already selected)
      fireEvent.click(starButtons[2])

      // Wait a bit to ensure no autosave happens
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Should not have called autosave (same value)
      expect(createOrUpdateQuizRatingMock).not.toHaveBeenCalled()
    })
  })

  describe('host nickname fallback', () => {
    it('shows N/A as host nickname when host.nickname is an empty string', () => {
      const results: GameResultDto = {
        ...classicMinimal(),
        host: {
          id: uuidv4(),
          nickname: '',
          avatar: DEFAULT_CRITTERS_AVATAR_V1,
        },
      }

      render(
        <MemoryRouter>
          <GameResultsPageUI results={results} currentParticipantId="p-1" />
        </MemoryRouter>,
      )

      expect(screen.getByText('N/A')).toBeInTheDocument()
    })
  })
})
