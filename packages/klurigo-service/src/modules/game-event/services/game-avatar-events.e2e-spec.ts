import {
  DEFAULT_CRITTERS_AVATAR_V1,
  GameAvatarSnapshot,
  GameEvent,
  GameEventType,
  GameMode,
  resolveGameAvatarSnapshot,
} from '@klurigo/common'
import { INestApplication } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { firstValueFrom, map, take, timeout, toArray } from 'rxjs'

import {
  buildMockSecondaryUser,
  createMockClassicQuizRequestDto,
  createMockGameDocument,
  createMockGameHostParticipantDocument,
  createMockGamePlayerParticipantDocument,
  createMockLobbyTaskDocument,
  createMockMultiChoiceQuestionDocument,
  createMockQuestionTaskDocument,
} from '../../../../test-utils/data'
import {
  cleanupTestApp,
  createTestApp,
  resetTestState,
} from '../../../../test-utils/utils'
import { GameRepository } from '../../game-core/repositories'
import { Game, GameModel } from '../../game-core/repositories/models/schemas'
import {
  buildLeaderboardTask,
  updateParticipantsAndBuildLeaderboard,
} from '../../game-task/utils/task-leaderboard.utils'
import { buildPodiumTask } from '../../game-task/utils/task-podium.utils'
import { buildQuestionResultTask } from '../../game-task/utils/task-question-result.utils'
import { QuizService } from '../../quiz-api/services'
import { User, UserModel } from '../../user/repositories'

import { GameEventPublisher } from './game-event.publisher'
import { GameEventSubscriber } from './game-event.subscriber'

describe('Game avatar event snapshots (e2e)', () => {
  let app: INestApplication
  let gameModel: GameModel
  let userModel: UserModel

  beforeAll(async () => {
    app = await createTestApp()
    gameModel = app.get<GameModel>(getModelToken(Game.name))
    userModel = app.get<UserModel>(getModelToken(User.name))
  })
  beforeEach(async () => resetTestState(app))
  afterAll(async () => cleanupTestApp(app))

  it.each(Object.values(GameMode))(
    'retains ranking snapshots through persistence and stream recovery in %s',
    async (mode) => {
      const avatar = {
        ...DEFAULT_CRITTERS_AVATAR_V1,
        body: 'block' as const,
        top: null,
      }
      const guestAvatar = {
        ...DEFAULT_CRITTERS_AVATAR_V1,
        body: 'dome' as const,
        cheeks: null,
      }
      const user = await userModel.create(buildMockSecondaryUser({ avatar }))
      const quiz = await app
        .get(QuizService)
        .createQuiz(createMockClassicQuizRequestDto(), user)
      const host = createMockGameHostParticipantDocument({ avatar })
      const guest = createMockGamePlayerParticipantDocument({
        participantId: 'guest',
        nickname: 'Guest',
        avatar: guestAvatar,
      })
      const player = createMockGamePlayerParticipantDocument({
        participantId: user._id,
        avatar,
      })
      let game = await gameModel.create(
        createMockGameDocument({
          mode,
          quiz: quiz.id as never,
          participants: [host, guest, player],
          questions: [createMockMultiChoiceQuestionDocument()],
          nextQuestion: 1,
          currentTask: createMockQuestionTaskDocument({ status: 'completed' }),
        }),
      )
      game.currentTask = buildQuestionResultTask(game)
      const ranking = updateParticipantsAndBuildLeaderboard(game)
      const tasks = [
        game.currentTask,
        buildLeaderboardTask(game, ranking),
        buildPodiumTask(game, ranking),
      ]
      expect(
        resolveGameAvatarSnapshot(game.currentTask.results[0].avatar),
      ).toEqual(guestAvatar)
      expect(ranking.map(({ avatar }) => avatar)).toEqual([guestAvatar, avatar])
      await userModel.findByIdAndUpdate(user._id, {
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      })
      for (const task of tasks) {
        if (task !== tasks[0]) game.previousTasks = [tasks[0]]
        game.currentTask = task
        game.currentTask.status = 'active'
        game.version = (game.version ?? 0) + 1
        await game.save()
        game = await app.get(GameRepository).findGameByIDOrThrow(game._id)
        for (const participantId of [
          host.participantId,
          player.participantId,
        ]) {
          const subscriber = app.get(GameEventSubscriber)
          const stream = await subscriber.subscribe(game._id, participantId)
          const events = firstValueFrom(
            stream.pipe(
              map(({ data }) => JSON.parse(String(data)) as GameEvent),
              take(2),
              timeout(5000),
              toArray(),
            ),
          )
          game.version = (game.version ?? 0) + 1
          await game.save()
          await app.get(GameEventPublisher).publish(game)
          const [initial, live] = await events
          const recovered = await firstValueFrom(
            (await subscriber.subscribe(game._id, participantId)).pipe(
              map(({ data }) => JSON.parse(String(data)) as GameEvent),
              timeout(5000),
            ),
          )
          expect(live).toEqual(initial)
          expect(recovered).toEqual(initial)
          if (initial && 'leaderboard' in initial)
            expect(
              initial.leaderboard.map(
                (entry: { avatar?: GameAvatarSnapshot }) => entry.avatar,
              ),
            ).toEqual([guestAvatar, avatar])
          if (initial && 'player' in initial) {
            expect(initial.player.avatar).toEqual(avatar)
            if ('behind' in initial.player)
              expect(initial.player.behind).toHaveProperty(
                'avatar',
                guestAvatar,
              )
          }
        }
      }
    },
  )

  it.each(['host', 'player', 'legacy'] as const)(
    'preserves %s lobby designs across initial, live, and reconnect SSE payloads',
    async (viewer) => {
      const avatar = {
        ...DEFAULT_CRITTERS_AVATAR_V1,
        body: 'block' as const,
        top: null,
      }
      const user = await userModel.create(buildMockSecondaryUser({ avatar }))
      const host = createMockGameHostParticipantDocument({ avatar })
      const player = createMockGamePlayerParticipantDocument({
        participantId: user._id,
        ...(viewer === 'legacy' ? {} : { avatar }),
      })
      const game = await gameModel.create(
        createMockGameDocument({
          participants: [host, player],
          currentTask: createMockLobbyTaskDocument({ status: 'active' }),
        }),
      )
      const participantId =
        viewer === 'host' ? host.participantId : player.participantId
      const subscriber = app.get(GameEventSubscriber)
      const stream = await subscriber.subscribe(game._id, participantId)
      const events = firstValueFrom(
        stream.pipe(
          map(({ data }) => JSON.parse(String(data)) as GameEvent),
          take(2),
          timeout(5000),
          toArray(),
        ),
      )
      await userModel.findByIdAndUpdate(user._id, {
        avatar: DEFAULT_CRITTERS_AVATAR_V1,
      })
      game.version = (game.version ?? 0) + 1
      await game.save()
      await app.get(GameEventPublisher).publish(game)
      const [initial, live] = await events
      const recovered = await firstValueFrom(
        (await subscriber.subscribe(game._id, participantId)).pipe(
          map(({ data }) => JSON.parse(String(data)) as GameEvent),
          timeout(5000),
        ),
      )
      expect(live).toEqual(initial)
      expect(recovered).toEqual(initial)
      expect(initial).toMatchObject({
        type:
          viewer === 'host'
            ? GameEventType.GameLobbyHost
            : GameEventType.GameLobbyPlayer,
        host: { avatar },
        players: [
          {
            nickname: player.nickname,
            avatar: viewer === 'legacy' ? DEFAULT_CRITTERS_AVATAR_V1 : avatar,
          },
        ],
      })
      if (initial && 'player' in initial) {
        expect(initial.player.avatar).toEqual(
          viewer === 'legacy' ? DEFAULT_CRITTERS_AVATAR_V1 : avatar,
        )
      }
      const persisted = await gameModel.findById(game._id).lean()
      if (viewer === 'legacy')
        expect(persisted?.participants[1]).not.toHaveProperty('avatar')
      else expect(persisted?.participants[1].avatar).toEqual(avatar)
    },
  )
})
