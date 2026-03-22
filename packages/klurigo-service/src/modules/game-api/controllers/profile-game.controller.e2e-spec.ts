import { GameMode, GameParticipantType, GameStatus } from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  createMockGameDocument,
  createMockGameHostParticipantDocument,
  createMockGamePlayerParticipantDocument,
  createMockPodiumTaskDocument,
  createMockQuestionTaskDocument,
  offsetSeconds,
} from '../../../../test-utils/data'
import {
  closeTestApp,
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
    await closeTestApp(app)
  })

  describe('/api/profile/games (GET)', () => {
    it("should succeed in retrieving a player's past active and completed games", async () => {
      const { accessToken, user } = await createDefaultUserAndAuthenticate(app)

      await gameModel.insertMany(buildFirstPageGameDocuments(user))

      return supertest(app.getHttpServer())
        .get('/api/profile/games')
        .set({ Authorization: `Bearer ${accessToken}` })
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
        }),
      ])

      return supertest(app.getHttpServer())
        .get('/api/profile/games?offset=5&limit=5')
        .set({ Authorization: `Bearer ${accessToken}` })
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
        .set({ Authorization: `Bearer ${accessToken}` })
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
      const gameID = uuidv4()

      return supertest(app.getHttpServer())
        .get(`/api/games/${gameID}/results`)
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })
  })
})

function buildFirstPageGameDocuments(user: User): Game[] {
  const { _id: participantId } = user
  return [
    createMockGameDocument({
      status: GameStatus.Expired,
      participants: [createMockGameHostParticipantDocument({ participantId })],
      created: offsetSeconds(0),
    }),
    createMockGameDocument({
      status: GameStatus.Completed,
      participants: [createMockGameHostParticipantDocument({ participantId })],
      currentTask: createMockPodiumTaskDocument(),
      created: offsetSeconds(1),
    }),
    createMockGameDocument({
      status: GameStatus.Completed,
      participants: [createMockGameHostParticipantDocument({ participantId })],
      currentTask: createMockPodiumTaskDocument(),
      created: offsetSeconds(2),
    }),
    createMockGameDocument({
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
    }),
    createMockGameDocument({
      status: GameStatus.Active,
      participants: [createMockGameHostParticipantDocument({ participantId })],
      currentTask: createMockQuestionTaskDocument(),
      created: offsetSeconds(4),
    }),
    createMockGameDocument({
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
    }),
  ]
}
