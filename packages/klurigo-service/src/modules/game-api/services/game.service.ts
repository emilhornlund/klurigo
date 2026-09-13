import {
  CreateGameResponseDto,
  GameHistoryBaseDto,
  GameParticipantPlayerDto,
  GameParticipantType,
  GameStatus,
  MultiChoiceQuestionCorrectAnswerDto,
  normalizeString,
  PaginatedGameHistoryDto,
  QuestionType,
  QUIZ_TYPE_ANSWER_OPTIONS_MAX,
  QUIZ_TYPE_ANSWER_OPTIONS_VALUE_MAX_LENGTH,
  QUIZ_TYPE_ANSWER_OPTIONS_VALUE_MIN_LENGTH,
  QUIZ_TYPE_ANSWER_OPTIONS_VALUE_REGEX,
  RangeQuestionCorrectAnswerDto,
  SubmitQuestionAnswerRequestDto,
  TrueFalseQuestionCorrectAnswerDto,
  TypeAnswerQuestionCorrectAnswerDto,
} from '@klurigo/common'
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { InjectRedis } from '@nestjs-modules/ioredis'
import { Redis } from 'ioredis'

import {
  GamePlayerJoinEvent,
  GamePlayerJoinEventKey,
} from '../../../app/shared/event/game-join.event'
import { getErrorStack, structuredLog } from '../../../app/utils'
import { PlayerNotFoundException } from '../../game-core/exceptions'
import {
  GameAnswerRepository,
  GameRepository,
} from '../../game-core/repositories'
import {
  GameDocument,
  QuestionResultTaskCorrectAnswer,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import {
  getTaskIdentity,
  isParticipantHost,
  isParticipantPlayer,
} from '../../game-core/utils'
import { GameEventPublisher } from '../../game-event/services'
import {
  buildGameQuitEvent,
  toQuestionTaskAnswer,
} from '../../game-event/utils'
import { GameTaskTransitionScheduler } from '../../game-task/services'
import { rebuildQuestionResultTask } from '../../game-task/utils'
import {
  isMultiChoiceCorrectAnswer,
  isRangeCorrectAnswer,
  isTrueFalseCorrectAnswer,
  isTypeAnswerCorrectAnswer,
} from '../../game-task/utils/question-answer-type-guards'
import { isQuestionResultTask } from '../../game-task/utils/task-type-guards'
import { QuizRepository } from '../../quiz-core/repositories'
import {
  isMultiChoiceQuestion,
  isRangeQuestion,
  isTrueFalseQuestion,
  isTypeAnswerQuestion,
} from '../../quiz-core/utils'
import { User } from '../../user/repositories'
import {
  GameFullException,
  NicknameNotUniqueException,
  PlayerNotUniqueException,
} from '../exceptions'

import {
  addPlayerParticipantToGame,
  isGameFull,
  isNicknameUnique,
  isPlayerUnique,
} from './utils'

/**
 * Service for managing game operations such as creating games, handling tasks, and game lifecycles.
 *
 * This service coordinates with the game repository for data persistence and
 * uses the GameTaskTransitionScheduler to manage task transitions.
 */
@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name)

  /**
   * Creates an instance of GameService.
   *
   * @param redis - The Redis instance used for answer synchronization and task coordination.
   * @param gameRepository - Repository responsible for reading and persisting game documents.
   * @param gameAnswerRepository - Repository responsible for storing and retrieving current-question answers in Redis.
   * @param gameTaskTransitionScheduler - Scheduler responsible for task transitions and time-based progression.
   * @param gameEventPublisher - Service responsible for publishing game events to clients.
   * @param quizRepository - Repository for accessing and modifying quiz documents.
   * @param eventEmitter - Emits application events (e.g., `game.deleted`) for cross-module cleanup.
   */
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly gameRepository: GameRepository,
    private readonly gameAnswerRepository: GameAnswerRepository,
    private readonly gameTaskTransitionScheduler: GameTaskTransitionScheduler,
    private readonly gameEventPublisher: GameEventPublisher,
    private readonly quizRepository: QuizRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a new game based on the provided quiz ID. It generates a unique 6-digit game PIN,
   * saves the game, and returns a response containing the game ID and JWT token for the host.
   *
   * @param quizId - The ID of the quiz to create a game from.
   * @param user - The user object containing details of the authorized user creating the game.
   *
   * @returns A Promise that resolves to the response object containing the created game details.
   */
  public async createGame(
    quizId: string,
    user: User,
  ): Promise<CreateGameResponseDto> {
    const quiz = await this.quizRepository.findQuizByIdOrThrow(quizId)

    const gameDocument = await this.gameRepository.createGame(quiz, user)

    await this.gameTaskTransitionScheduler.scheduleTaskTransition(gameDocument)

    return { id: gameDocument._id }
  }

  /**
   * Retrieves games where the given user has participated.
   *
   * @param participantId - The ID of the participant whose games should be fetched.
   * @param offset - The number of games to skip for pagination.
   * @param limit - The maximum number of games to return.
   * @returns A paginated list of game history DTOs.
   */
  public async findGamesByParticipantId(
    participantId: string,
    offset: number = 0,
    limit: number = 5,
  ): Promise<PaginatedGameHistoryDto> {
    const { results, total } =
      await this.gameRepository.findGamesByParticipantId(
        participantId,
        offset,
        limit,
      )

    return {
      results: results.map((gameDocument) => {
        const participant = gameDocument.participants?.find(
          (participant) => participant.participantId === participantId,
        )

        if (!participant) {
          throw new Error(
            `Participant ${participantId} not found in game ${gameDocument._id}`,
          )
        }

        const status =
          gameDocument.status === GameStatus.Completed ||
          (gameDocument.status === GameStatus.Active &&
            gameDocument.currentTask.type === TaskType.Podium)
            ? GameStatus.Completed
            : gameDocument.status

        const common: GameHistoryBaseDto = {
          id: gameDocument._id,
          name: gameDocument.name,
          mode: gameDocument.mode,
          status,
          imageCoverURL: gameDocument.quiz?.imageCoverURL,
          created: gameDocument.created,
        }

        if (isParticipantHost(participant)) {
          return {
            ...common,
            participantType: GameParticipantType.HOST,
          }
        } else if (isParticipantPlayer(participant)) {
          return {
            ...common,
            participantType: GameParticipantType.PLAYER,
            rank: participant.rank,
            score: participant.totalScore,
          }
        }

        throw new Error(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          `Unknown participant type: ${(participant as any).type}`,
        )
      }),
      total,
      limit,
      offset,
    }
  }

  /**
   * Adds a player to an active game if the game exists and can accept additional players.
   * Ensures that both the player identifier and nickname are unique within the game
   * before adding the participant.
   *
   * @param gameId - The unique identifier of the game the player wants to join.
   * @param participantId - The unique identifier of the player joining the game.
   * @param nickname - The nickname chosen by the player. Must be unique within the game.
   *
   * @returns {Promise<void>} A Promise that resolves when the player is successfully added to the game.
   *
   * @throws {GameFullException} If the game has already reached the maximum number of allowed player participants.
   * @throws {ActiveGameNotFoundByIDException} If no active game with the specified `gameId` exists.
   * @throws {NicknameNotUniqueException} If the provided `nickname` is already taken by another player in the game.
   * @throws {PlayerNotUniqueException} If the participant is already registered as a player in the game.
   */
  public async joinGame(
    gameId: string,
    participantId: string,
    nickname: string,
  ): Promise<void> {
    await this.gameRepository.findGameByIDOrThrow(gameId)

    let joined = false
    const savedGameDocument =
      await this.gameRepository.findAndSaveWithLockIfChanged(
        gameId,
        async (currentDocument) => {
          const existingParticipant = currentDocument.participants.find(
            (participant) => participant.participantId === participantId,
          )

          // A retried request for the same player and nickname is already complete.
          // Returning undefined also prevents a duplicate game event and revision.
          if (
            existingParticipant &&
            isParticipantPlayer(existingParticipant) &&
            existingParticipant.nickname.trim() === nickname.trim()
          ) {
            return undefined
          }

          if (
            currentDocument.status !== undefined &&
            currentDocument.status !== GameStatus.Active
          ) {
            throw new BadRequestException(
              `Cannot join game ${gameId} while it is ${currentDocument.status}`,
            )
          }

          if (currentDocument.currentTask.type === TaskType.Podium) {
            throw new BadRequestException(
              `Cannot join game ${gameId} while its final leaderboard is active`,
            )
          }

          if (isGameFull(currentDocument.participants)) {
            throw new GameFullException()
          }

          if (
            existingParticipant ||
            !isPlayerUnique(currentDocument.participants, participantId)
          ) {
            throw new PlayerNotUniqueException()
          }

          if (!isNicknameUnique(currentDocument.participants, nickname)) {
            throw new NicknameNotUniqueException(nickname)
          }

          joined = true
          return addPlayerParticipantToGame(
            currentDocument,
            participantId,
            nickname,
          )
        },
      )

    if (!joined) return

    await this.gameEventPublisher.publish(savedGameDocument)

    this.emitGamePlayerJoinEvent(gameId, participantId, nickname)
  }

  /**
   * Emits a `game.player.join` event after a participant has successfully joined a game.
   *
   * The event is best-effort: failures are deliberately suppressed to avoid breaking
   * the primary join flow due to non-critical side-effects (e.g., profile updates).
   *
   * @param gameId - The ID of the game that the participant joined.
   * @param participantId - The ID of the participant (user) that joined the game.
   * @param nickname - The nickname used by the participant when joining the game.
   * @private
   */
  private emitGamePlayerJoinEvent(
    gameId: string,
    participantId: string,
    nickname: string,
  ) {
    try {
      this.logger.debug(`Emitting player join event for game '${gameId}'`)
      const event: GamePlayerJoinEvent = { gameId, participantId, nickname }
      this.eventEmitter.emit(GamePlayerJoinEventKey, event)
    } catch (error) {
      this.logger.error(
        structuredLog('Failed to emit player join event.', {
          operation: 'emitGamePlayerJoinEvent',
          gameId,
          playerId: participantId,
        }),
        getErrorStack(error),
      )
    }
  }

  /**
   * Retrieves the current list of player participants for a game.
   *
   * @param gameId - The unique identifier of the game.
   * @returns The list of player participants for the specified game.
   */
  public async getPlayerParticipants(
    gameId: string,
  ): Promise<GameParticipantPlayerDto[]> {
    const gameDocument = await this.gameRepository.findGameByIDOrThrow(gameId)

    return gameDocument.participants
      .filter(isParticipantPlayer)
      .map(({ participantId, nickname }): GameParticipantPlayerDto => ({
        id: participantId,
        nickname,
      }))
  }

  /**
   * Removes a player from a game.
   *
   * This method removes a specified player from a game. It enforces the following rules:
   * - Players can only remove themselves.
   * - Hosts can remove any player except themselves.
   *
   * @param authorizedParticipantId - The unique identifier of the participant performing the removal.
   * @param gameId - The unique identifier of the game.
   * @param participantIdToRemove - The unique identifier of the player to remove.
   *
   * @returns A Promise that resolves when the player is successfully removed from the game.
   *
   * @throws {PlayerNotFoundException} If the specified player does not exist in the game.
   * @throws {ForbiddenException} If the participant is not authorized to remove the specified player.
   */
  public async leaveGame(
    authorizedParticipantId: string,
    gameId: string,
    participantIdToRemove: string,
  ): Promise<void> {
    const gameDocument = await this.gameRepository.findGameByIDOrThrow(gameId)

    const currentParticipant = gameDocument.participants.find(
      (participant) => participant.participantId === authorizedParticipantId,
    )

    const participantToRemove = gameDocument.participants.find(
      (participant) => participant.participantId === participantIdToRemove,
    )

    if (!participantToRemove) {
      throw new PlayerNotFoundException(participantIdToRemove)
    }

    if (
      !currentParticipant ||
      participantToRemove.type !== GameParticipantType.PLAYER ||
      (currentParticipant.type === GameParticipantType.PLAYER &&
        authorizedParticipantId !== participantIdToRemove)
    ) {
      throw new ForbiddenException('Forbidden to remove player')
    }

    const savedGameDocument = await this.gameRepository.findAndSaveWithLock(
      gameId,
      async (currentDocument) => {
        currentDocument.participants = currentDocument.participants.filter(
          (participant) => participant.participantId !== participantIdToRemove,
        )
        return currentDocument
      },
    )

    await this.gameEventPublisher.publish(savedGameDocument)

    if (currentParticipant.type === GameParticipantType.HOST) {
      await this.gameEventPublisher.publishParticipantEvent(
        gameId,
        participantToRemove,
        buildGameQuitEvent(savedGameDocument.status),
        savedGameDocument.version,
      )
    }
  }

  /**
   * Completes the current active task for a specified game.
   *
   * @param {string} gameID - The unique identifier of the game.
   *
   * @throws {BadRequestException} if the current task is not in an 'active' status.
   *
   * @returns {Promise<void>} A promise that resolves when the task is completed and further transition scheduling is triggered.
   */
  public async completeCurrentTask(gameID: string): Promise<void> {
    const gameDocument = await this.gameRepository.findGameByIDOrThrow(gameID)

    if (
      (gameDocument.status !== undefined &&
        gameDocument.status !== GameStatus.Active) ||
      !Object.values(TaskType).includes(gameDocument.currentTask.type) ||
      gameDocument.currentTask.status !== 'active'
    ) {
      throw new BadRequestException('Current task not in active status')
    }

    await this.gameTaskTransitionScheduler.scheduleTaskTransition(gameDocument)
  }

  /**
   * Submits an answer for the current question in a game.
   *
   * @param {string} playerId - The ID of the player submitting the answer.
   * @param {string} gameID - The ID of the game where the answer is being submitted.
   * @param {object} submitQuestionAnswerRequest - The request containing the answer details.
   *
   * @returns {Promise<void>} Resolves when the answer submission is successful.
   */
  public async submitQuestionAnswer(
    gameID: string,
    playerId: string,
    submitQuestionAnswerRequest: SubmitQuestionAnswerRequestDto,
  ): Promise<void> {
    const gameDocument = await this.gameRepository.findGameByIDOrThrow(gameID)

    if (
      (gameDocument.status !== undefined &&
        gameDocument.status !== GameStatus.Active) ||
      gameDocument.currentTask.type !== TaskType.Question ||
      gameDocument.currentTask.status !== 'active'
    ) {
      throw new BadRequestException(
        'Current task is either not of question type or not in active status',
      )
    }

    const expectedTask = getTaskIdentity(gameDocument)
    const answer = toQuestionTaskAnswer(playerId, submitQuestionAnswerRequest)
    let result:
      Awaited<ReturnType<GameAnswerRepository['submitOnce']>> | undefined
    let playerCount = 0

    const savedGameDocument = await this.gameRepository.findAndSaveWithLock(
      gameID,
      async (currentDocument) => {
        if (
          (currentDocument.status !== undefined &&
            currentDocument.status !== GameStatus.Active) ||
          currentDocument.currentTask._id !== expectedTask.id ||
          currentDocument.currentTask.type !== TaskType.Question ||
          currentDocument.currentTask.status !== 'active'
        ) {
          throw new BadRequestException(
            `Cannot submit an answer because the current task changed for game ${gameID}`,
          )
        }

        playerCount = currentDocument.participants.filter(
          (participant) => participant.type === GameParticipantType.PLAYER,
        ).length

        result = currentDocument.currentTask._id
          ? await this.gameAnswerRepository.submitOnce(
              gameID,
              answer,
              playerCount,
              currentDocument.currentTask._id,
            )
          : await this.gameAnswerRepository.submitOnce(
              gameID,
              answer,
              playerCount,
            )
        return currentDocument
      },
    )

    if (!result || !result.accepted) {
      throw new BadRequestException('Answer already provided')
    }

    // determine if all players have submitted an answer after accepting the current submission
    if (result.answerCount === playerCount) {
      await this.gameTaskTransitionScheduler.scheduleTaskTransition(
        savedGameDocument,
      )
    } else {
      await this.gameEventPublisher.publish(savedGameDocument)
    }
  }

  /**
   * Adds a new correct answer to the current question result task.
   *
   * Multi-choice and type-answer values are added to the accepted set. Range
   * and true-false values atomically replace their existing singleton value.
   *
   * @param gameID - The ID of the game to update.
   * @param correctAnswerRequest - The correct answer to add or set.
   * @throws {BadRequestException} If the current task is not a `QuestionResult` or not in active status.
   */
  public async addCorrectAnswer(
    gameID: string,
    correctAnswerRequest:
      | MultiChoiceQuestionCorrectAnswerDto
      | RangeQuestionCorrectAnswerDto
      | TrueFalseQuestionCorrectAnswerDto
      | TypeAnswerQuestionCorrectAnswerDto,
  ): Promise<void> {
    await this.mutateCorrectAnswer(gameID, correctAnswerRequest, 'add')
  }

  /**
   * Deletes a specific correct answer from the current question result task.
   *
   * Multi-choice and type-answer values are removed from the accepted set.
   * Deleting singleton range and true-false values is rejected to prevent an
   * invalid empty state; those values are changed through `addCorrectAnswer`.
   *
   * @param gameID - The ID of the game to update.
   * @param correctAnswerRequest - The correct answer to remove.
   * @throws {BadRequestException} If the current task is not a `QuestionResult` or not active status.
   */
  public async deleteCorrectAnswer(
    gameID: string,
    correctAnswerRequest:
      | MultiChoiceQuestionCorrectAnswerDto
      | RangeQuestionCorrectAnswerDto
      | TrueFalseQuestionCorrectAnswerDto
      | TypeAnswerQuestionCorrectAnswerDto,
  ): Promise<void> {
    await this.mutateCorrectAnswer(gameID, correctAnswerRequest, 'delete')
  }

  private async mutateCorrectAnswer(
    gameID: string,
    correctAnswerRequest:
      | MultiChoiceQuestionCorrectAnswerDto
      | RangeQuestionCorrectAnswerDto
      | TrueFalseQuestionCorrectAnswerDto
      | TypeAnswerQuestionCorrectAnswerDto,
    operation: 'add' | 'delete',
  ): Promise<void> {
    const gameDocument = await this.gameRepository.findGameByIDOrThrow(gameID)

    if (
      gameDocument.status !== GameStatus.Active ||
      !isQuestionResultTask(gameDocument) ||
      gameDocument.currentTask.status !== 'active'
    ) {
      throw new BadRequestException(
        'Current task is either not of question result type or not in active status',
      )
    }

    const expectedTask = getTaskIdentity(gameDocument)
    const savedGameDocument =
      await this.gameRepository.findAndSaveWithLockIfChanged(
        gameID,
        async (currentDocument) => {
          if (
            currentDocument.status !== GameStatus.Active ||
            currentDocument.currentTask._id !== expectedTask.id ||
            !isQuestionResultTask(currentDocument) ||
            currentDocument.currentTask.status !== 'active'
          ) {
            throw new BadRequestException(
              `Cannot ${operation} a correct answer because the current task changed for game ${gameID}`,
            )
          }

          const questionIndex = currentDocument.currentTask.questionIndex
          const previousTask = currentDocument.previousTasks?.at(-1)
          if (
            previousTask?.type !== TaskType.Question ||
            previousTask.questionIndex !== questionIndex
          ) {
            throw new BadRequestException(
              'The current question result does not match its question task',
            )
          }

          const nextCorrectAnswers = mutateCorrectAnswers(
            currentDocument.questions[questionIndex],
            currentDocument.currentTask.correctAnswers,
            correctAnswerRequest,
            operation,
          )
          if (!nextCorrectAnswers) {
            return undefined
          }

          currentDocument.currentTask.correctAnswers = nextCorrectAnswers
          currentDocument.currentTask =
            rebuildQuestionResultTask(currentDocument)
          return currentDocument
        },
      )

    await this.gameEventPublisher.publish(savedGameDocument)
  }

  /**
   * Deletes all games associated with a quiz.
   *
   * @param quizId - The ID of the quiz whose games should be deleted.
   * @returns Resolves when all matching games have been processed.
   */
  public async deleteQuiz(quizId: string): Promise<void> {
    const games = await this.gameRepository.find({
      quiz: quizId as never,
    })

    for (const game of games) {
      try {
        const deleted = await this.gameRepository.delete(game._id)
        if (deleted) {
          this.logger.debug(`Emitting deleted event for game '${game._id}'`)
          this.eventEmitter.emit('game.deleted', { gameId: game._id })
        }
      } catch (error) {
        this.logger.error(
          structuredLog('Failed to delete game during quiz cleanup.', {
            operation: 'deleteQuiz',
            quizId,
            gameId: game._id,
            gameState: game.status,
            taskType: game.currentTask?.type,
            taskStatus: game.currentTask?.status,
          }),
          getErrorStack(error),
        )
      }
    }
  }

  /**
   * Ends the active game by setting its status to TERMINATED.
   *
   * If the game is already terminated, the operation is a no-op.
   * The updated game state is then published to connected clients.
   *
   * @param gameId - The game ID to terminate.
   */
  public async quitGame(gameId: string): Promise<void> {
    await this.gameRepository.findGameByIDOrThrow(gameId)

    const savedGame = await this.gameRepository.findAndSaveWithLock(
      gameId,
      async (game) => {
        if (game.status !== GameStatus.Active) {
          throw new BadRequestException(
            `Cannot quit game ${gameId} while it is ${game.status}`,
          )
        }
        game.status = GameStatus.Terminated
        return game
      },
    )

    await this.gameEventPublisher.publish(savedGame)
  }
}

type SupportedCorrectAnswerRequest =
  | MultiChoiceQuestionCorrectAnswerDto
  | RangeQuestionCorrectAnswerDto
  | TrueFalseQuestionCorrectAnswerDto
  | TypeAnswerQuestionCorrectAnswerDto

function mutateCorrectAnswers(
  question: GameDocument['questions'][number] | undefined,
  currentAnswers: QuestionResultTaskCorrectAnswer[],
  request: SupportedCorrectAnswerRequest,
  operation: 'add' | 'delete',
): QuestionResultTaskCorrectAnswer[] | undefined {
  if (!question || question.type !== request.type) {
    throw new BadRequestException(
      'Correct answer type does not match the current question',
    )
  }
  if (currentAnswers.some((answer) => answer.type !== question.type)) {
    throw new BadRequestException(
      'Current correct answers do not match the current question',
    )
  }

  let nextAnswers: QuestionResultTaskCorrectAnswer[]
  switch (request.type) {
    case QuestionType.MultiChoice: {
      if (
        !isMultiChoiceQuestion(question) ||
        !Number.isInteger(request.index) ||
        request.index < 0 ||
        request.index >= question.options.length
      ) {
        throw new BadRequestException(
          'Correct multi-choice option does not belong to the current question',
        )
      }

      const indexes = [
        ...new Set(
          currentAnswers
            .filter(isMultiChoiceCorrectAnswer)
            .map(({ index }) => index),
        ),
      ]
      nextAnswers = (
        operation === 'add'
          ? indexes.includes(request.index)
            ? indexes
            : [...indexes, request.index]
          : indexes.filter((index) => index !== request.index)
      ).map((index) => ({ type: QuestionType.MultiChoice, index }))
      break
    }
    case QuestionType.TypeAnswer: {
      if (
        !isTypeAnswerQuestion(question) ||
        request.value.length < QUIZ_TYPE_ANSWER_OPTIONS_VALUE_MIN_LENGTH ||
        request.value.length > QUIZ_TYPE_ANSWER_OPTIONS_VALUE_MAX_LENGTH ||
        !QUIZ_TYPE_ANSWER_OPTIONS_VALUE_REGEX.test(request.value)
      ) {
        throw new BadRequestException('Correct type-answer value is invalid')
      }

      const value = request.value.trim()
      if (value.length < QUIZ_TYPE_ANSWER_OPTIONS_VALUE_MIN_LENGTH) {
        throw new BadRequestException('Correct type-answer value is invalid')
      }
      const normalizedValue = normalizeString(value)
      const values = currentAnswers
        .filter(isTypeAnswerCorrectAnswer)
        .reduce<string[]>((unique, answer) => {
          if (
            !unique.some(
              (existing) =>
                normalizeString(existing) === normalizeString(answer.value),
            )
          ) {
            unique.push(answer.value)
          }
          return unique
        }, [])

      const existingIndex = values.findIndex(
        (existing) => normalizeString(existing) === normalizedValue,
      )
      if (
        operation === 'add' &&
        existingIndex < 0 &&
        values.length >= QUIZ_TYPE_ANSWER_OPTIONS_MAX
      ) {
        throw new BadRequestException(
          'The current question already has the maximum number of accepted answers',
        )
      }

      nextAnswers = (
        operation === 'add'
          ? existingIndex >= 0
            ? values
            : [...values, value]
          : values.filter(
              (existing) => normalizeString(existing) !== normalizedValue,
            )
      ).map((answerValue) => ({
        type: QuestionType.TypeAnswer,
        value: answerValue,
      }))
      break
    }
    case QuestionType.TrueFalse:
      if (!isTrueFalseQuestion(question)) {
        throw new BadRequestException(
          'Correct answer type does not match the current question',
        )
      }
      if (operation === 'delete') {
        throw new BadRequestException(
          'Cannot delete the only correct true-false answer; add its replacement instead',
        )
      }
      nextAnswers = [{ type: QuestionType.TrueFalse, value: request.value }]
      break
    case QuestionType.Range:
      if (
        !isRangeQuestion(question) ||
        !Number.isFinite(request.value) ||
        request.value < question.min ||
        request.value > question.max
      ) {
        throw new BadRequestException(
          'The correct range value must be within the current question range',
        )
      }
      if (operation === 'delete') {
        throw new BadRequestException(
          'Cannot delete the only correct range answer; add its replacement instead',
        )
      }
      nextAnswers = [{ type: QuestionType.Range, value: request.value }]
      break
  }

  return correctAnswersEqual(currentAnswers, nextAnswers)
    ? undefined
    : nextAnswers
}

function correctAnswersEqual(
  left: QuestionResultTaskCorrectAnswer[],
  right: QuestionResultTaskCorrectAnswer[],
): boolean {
  return (
    left.length === right.length &&
    left.every((answer, index) => {
      const other = right[index]
      if (isMultiChoiceCorrectAnswer(answer)) {
        return isMultiChoiceCorrectAnswer(other) && answer.index === other.index
      }
      if (isRangeCorrectAnswer(answer)) {
        return isRangeCorrectAnswer(other) && answer.value === other.value
      }
      if (isTrueFalseCorrectAnswer(answer)) {
        return isTrueFalseCorrectAnswer(other) && answer.value === other.value
      }
      return (
        isTypeAnswerCorrectAnswer(answer) &&
        isTypeAnswerCorrectAnswer(other) &&
        normalizeString(answer.value) === normalizeString(other.value)
      )
    })
  )
}
