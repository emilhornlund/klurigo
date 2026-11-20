import {
  GameMode,
  GameParticipantType,
  GameStatus,
  TokenScope,
} from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'

import {
  createMockGameDocument,
  createMockGameHostParticipantDocument,
  createMockGamePlayerParticipantDocument,
  createMockPodiumTaskDocument,
  createMockQuestionTaskDocument,
  createMockUniqueId,
  offsetSeconds,
} from '../../../../test-utils/data'
import {
  authenticateGame,
  cleanupTestApp,
  createBearerAuthHeader,
  createDefaultUserAndAuthenticate,
  createTestApp,
} from '../../../../test-utils/utils'
import { Game, GameModel } from '../../game-core/repositories/models/schemas'
import { User } from '../../user/repositories'

describe('ProfileGameController (e2e)', () => {
  let app: INestApplication
  let gameModel: GameModel

  beforeEach(async () => {
    app = await createTestApp()
    gameModel = app.get<GameModel>(getModelToken(Game.name))
  })

  afterEach(async () => {
    await cleanupTestApp(app)
  })

  describe('/api/profile/games (GET)', () => {
    it("should succeed in retrieving a player's past active and completed games", async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      await gameModel.insertMany(buildFirstPageGameDocuments(user))

      return supertest(app.getHttpServer())
        .get('/api/profile/games')
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            results: [
              {
                id: expect.any(String),
                name: 'Trivia Battle',
                mode: GameMode.Classic,
                status: GameStatus.Active,
                participantType: GameParticipantType.PLAYER,
                rank: 5,
                score: 4567,
                created: expect.any(String),
              },
              {
                id: expect.any(String),
                name: 'Trivia Battle',
                mode: GameMode.Classic,
                status: GameStatus.Active,
                participantType: GameParticipantType.HOST,
                created: expect.any(String),
              },
              {
                id: expect.any(String),
                name: 'Trivia Battle',
                mode: GameMode.Classic,
                status: GameStatus.Completed,
                participantType: GameParticipantType.PLAYER,
                rank: 1,
                score: 1337,
                created: expect.any(String),
              },
              {
                id: expect.any(String),
                name: 'Trivia Battle',
                mode: GameMode.Classic,
                status: GameStatus.Completed,
                participantType: GameParticipantType.HOST,
                created: expect.any(String),
              },
              {
                id: expect.any(String),
                name: 'Trivia Battle',
                mode: GameMode.Classic,
                status: GameStatus.Completed,
                participantType: GameParticipantType.HOST,
                created: expect.any(String),
              },
            ],
            offset: 0,
            limit: 5,
            total: 5,
          })
        })
    })

    it("should succeed in retrieving a the second page of the player's past active and completed games", async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      await gameModel.insertMany([
        ...buildFirstPageGameDocuments(user),
        createMockGameDocument({
          _id: createMockUniqueId(506),
          status: GameStatus.Completed,
          participants: [
            createMockGamePlayerParticipantDocument({
              participantId: user._id,
              rank: 9,
              totalScore: 499,
            }),
          ],
          currentTask: createMockPodiumTaskDocument(),
          created: offsetSeconds(0),
          updated: offsetSeconds(0),
        }),
      ])

      return supertest(app.getHttpServer())
        .get('/api/profile/games?offset=5&limit=5')
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            results: [
              {
                id: expect.any(String),
                name: 'Trivia Battle',
                mode: GameMode.Classic,
                status: GameStatus.Completed,
                participantType: GameParticipantType.PLAYER,
                rank: 9,
                score: 499,
                created: expect.any(String),
              },
            ],
            offset: 5,
            limit: 5,
            total: 6,
          })
        })
    })

    it('should succeed in retrieving empty results when a player has no past games', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .get('/api/profile/games')
        .set(createBearerAuthHeader(accessToken))
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            results: [],
            offset: 0,
            limit: 5,
            total: 0,
          })
        })
    })

    it('should return a 401 error when the request is unauthorized', () => {
      return supertest(app.getHttpServer())
        .get('/api/profile/games')
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })

    it('filters independently and in combination using effective status and the current user role', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const games = buildQueryGameDocuments(user)
      await gameModel.insertMany(games)
      const all = Array.from({ length: 18 }, (_, i) => i)
      const completedHosts = Array.from({ length: 12 }, (_, i) => i)
      const cases: [Record<string, string>, number[]][] = [
        [{}, all],
        [{ search: '' }, all],
        [{ search: 'tRiViA' }, completedHosts],
        [{ search: '.[x]+\\' }, completedHosts],
        [{ search: '[' }, completedHosts],
        [{ search: 'missing' }, []],
        [
          { participantType: GameParticipantType.HOST },
          [...completedHosts, 12, 15, 17],
        ],
        [{ participantType: GameParticipantType.PLAYER }, [13, 14, 16]],
        [{ mode: GameMode.Classic }, [...completedHosts, 13, 15, 16]],
        [{ mode: GameMode.ZeroToOneHundred }, [12, 14, 17]],
        [{ status: GameStatus.Active }, [12, 13, 15]],
        [{ status: GameStatus.Completed }, [...completedHosts, 14, 16, 17]],
        [
          {
            participantType: GameParticipantType.PLAYER,
            status: GameStatus.Completed,
          },
          [14, 16],
        ],
        [
          {
            search: 'tRiViA.[x]+\\',
            participantType: GameParticipantType.HOST,
            mode: GameMode.Classic,
            status: GameStatus.Completed,
          },
          completedHosts,
        ],
        [{ search: 'Trivia', participantType: GameParticipantType.PLAYER }, []],
      ]
      for (const [query, indices] of cases) {
        const response = await supertest(app.getHttpServer())
          .get('/api/profile/games')
          .query({ ...query, limit: 50 })
          .set(createBearerAuthHeader(accessToken))
          .expect(200)
        expect(response.body.total).toBe(indices.length)
        expect(
          response.body.results.map((game: { id: string }) => game.id),
        ).toEqual(
          sortGames(
            indices.map((i) => games[i]),
            'updated',
            'desc',
          ).map((game) => game._id),
        )
        for (const result of response.body.results) {
          const index = games.findIndex((game) => game._id === result.id)
          expect(result.status).toBe(
            [12, 13, 15].includes(index)
              ? GameStatus.Active
              : GameStatus.Completed,
          )
          expect(result.participantType).toBe(
            [13, 14, 16].includes(index)
              ? GameParticipantType.PLAYER
              : GameParticipantType.HOST,
          )
        }
      }
    })

    it('sorts all fields and directions deterministically across filtered pages', async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)
      const games = buildQueryGameDocuments(user)
      await gameModel.insertMany(games)
      for (const sort of ['name', 'created', 'updated'] as const) {
        for (const order of ['asc', 'desc'] as const) {
          const expected = sortGames(games.slice(0, 12), sort, order).map(
            (game) => game._id,
          )
          const ids: string[] = []
          for (const offset of [0, 5, 10, 15]) {
            const response = await supertest(app.getHttpServer())
              .get('/api/profile/games')
              .query({
                search: 'Trivia',
                participantType: GameParticipantType.HOST,
                mode: GameMode.Classic,
                status: GameStatus.Completed,
                sort,
                order,
                offset,
                limit: 5,
              })
              .set(createBearerAuthHeader(accessToken))
              .expect(200)
            expect(response.body).toMatchObject({ total: 12, offset, limit: 5 })
            const pageIds = response.body.results.map(
              (game: { id: string }) => game.id,
            )
            expect(pageIds).toEqual(expected.slice(offset, offset + 5))
            ids.push(...pageIds)
          }
          expect(ids).toEqual(expected)
        }
      }
      for (const [query, sort, order] of [
        [{}, 'updated', 'desc'],
        [{ sort: 'created' }, 'created', 'desc'],
        [{ order: 'asc' }, 'updated', 'asc'],
      ] as const) {
        const response = await supertest(app.getHttpServer())
          .get('/api/profile/games')
          .query(query)
          .set(createBearerAuthHeader(accessToken))
          .expect(200)
        expect(response.body).toMatchObject({ total: 18, offset: 0, limit: 5 })
        expect(
          response.body.results.map((game: { id: string }) => game.id),
        ).toEqual(
          sortGames(games.slice(0, 18), sort, order)
            .slice(0, 5)
            .map((game) => game._id),
        )
      }
    })

    it('rejects invalid query parameters', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)
      for (const query of [
        { participantType: 'OWNER' },
        { mode: 'OTHER' },
        { status: 'OTHER' },
        { status: GameStatus.Expired },
        { status: GameStatus.Terminated },
        { sort: 'status' },
        { order: 'ascending' },
        { limit: '4' },
        { limit: '51' },
        { offset: '-1' },
        { search: ['a', 'b'] },
      ]) {
        await supertest(app.getHttpServer())
          .get('/api/profile/games')
          .query(query)
          .set(createBearerAuthHeader(accessToken))
          .expect(400)
      }
    })

    it('rejects invalid tokens, game scope, and missing game authority', async () => {
      const { user } = await createDefaultUserAndAuthenticate(app)
      await supertest(app.getHttpServer())
        .get('/api/profile/games')
        .set(createBearerAuthHeader('invalid'))
        .expect(401)
      const gameToken = await authenticateGame(
        app,
        createMockUniqueId(800),
        user._id,
        GameParticipantType.HOST,
      )
      await supertest(app.getHttpServer())
        .get('/api/profile/games')
        .set(createBearerAuthHeader(gameToken))
        .expect(403)
      const token = await app
        .get(JwtService)
        .signAsync(
          { scope: TokenScope.User, authorities: [] },
          { subject: user._id },
        )
      await supertest(app.getHttpServer())
        .get('/api/profile/games')
        .set(createBearerAuthHeader(token))
        .expect(403)
    })
  })
})

function buildFirstPageGameDocuments(user: User): Game[] {
  const { _id: participantId } = user
  return [
    createMockGameDocument({
      _id: createMockUniqueId(500),
      status: GameStatus.Expired,
      participants: [createMockGameHostParticipantDocument({ participantId })],
      created: offsetSeconds(0),
    }),
    createMockGameDocument({
      _id: createMockUniqueId(501),
      status: GameStatus.Completed,
      participants: [createMockGameHostParticipantDocument({ participantId })],
      currentTask: createMockPodiumTaskDocument(),
      created: offsetSeconds(1),
      updated: offsetSeconds(1),
    }),
    createMockGameDocument({
      _id: createMockUniqueId(502),
      status: GameStatus.Completed,
      participants: [createMockGameHostParticipantDocument({ participantId })],
      currentTask: createMockPodiumTaskDocument(),
      created: offsetSeconds(2),
      updated: offsetSeconds(2),
    }),
    createMockGameDocument({
      _id: createMockUniqueId(503),
      status: GameStatus.Active,
      participants: [
        createMockGamePlayerParticipantDocument({
          participantId,
          rank: 1,
          totalScore: 1337,
        }),
      ],
      currentTask: createMockPodiumTaskDocument(),
      created: offsetSeconds(3),
      updated: offsetSeconds(3),
    }),
    createMockGameDocument({
      _id: createMockUniqueId(504),
      status: GameStatus.Active,
      participants: [createMockGameHostParticipantDocument({ participantId })],
      currentTask: createMockQuestionTaskDocument(),
      created: offsetSeconds(4),
      updated: offsetSeconds(4),
    }),
    createMockGameDocument({
      _id: createMockUniqueId(505),
      status: GameStatus.Active,
      participants: [
        createMockGamePlayerParticipantDocument({
          participantId,
          rank: 5,
          totalScore: 4567,
        }),
      ],
      currentTask: createMockQuestionTaskDocument(),
      created: offsetSeconds(5),
      updated: offsetSeconds(5),
    }),
  ]
}

function buildQueryGameDocuments(user: User): Game[] {
  return Array.from({ length: 21 }, (_, i) => {
    const player = [13, 14, 16].includes(i)
    const participantId = i === 20 ? createMockUniqueId(900) : user._id
    const active = [12, 13, 15].includes(i)
    return createMockGameDocument({
      _id: createMockUniqueId(600 + i),
      name: i < 12 ? `Trivia.[x]+\\ ${Math.floor(i / 4)}` : `Other ${i}`,
      mode: [12, 14, 17].includes(i)
        ? GameMode.ZeroToOneHundred
        : GameMode.Classic,
      status:
        i === 18
          ? GameStatus.Expired
          : i === 19
            ? GameStatus.Terminated
            : active || i % 2 === 0
              ? GameStatus.Active
              : GameStatus.Completed,
      currentTask: active
        ? createMockQuestionTaskDocument()
        : createMockPodiumTaskDocument(),
      participants: player
        ? [
            createMockGamePlayerParticipantDocument({ participantId }),
            createMockGameHostParticipantDocument({
              participantId: createMockUniqueId(901),
            }),
          ]
        : [
            createMockGameHostParticipantDocument({ participantId }),
            createMockGamePlayerParticipantDocument({
              participantId: createMockUniqueId(901),
            }),
          ],
      created: new Date(Date.UTC(2026, 0, 1, 0, 0, Math.floor(i / 3))),
      updated: new Date(Date.UTC(2026, 0, 1, 0, 0, Math.floor((20 - i) / 3))),
    })
  })
}

function sortGames(
  games: Game[],
  sort: 'name' | 'created' | 'updated',
  order: 'asc' | 'desc',
): Game[] {
  const direction = order === 'asc' ? 1 : -1
  return [...games].sort((a, b) => {
    const primary = a[sort] < b[sort] ? -1 : a[sort] > b[sort] ? 1 : 0
    return direction * (primary || (a._id < b._id ? -1 : 1))
  })
}
