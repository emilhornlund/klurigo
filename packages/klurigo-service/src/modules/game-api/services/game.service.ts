import {
  CreateGameResponseDto,
  GameHistoryBaseDto,
  GameParticipantPlayerDto,
  GameParticipantType,
  GameStatus,
  MultiChoiceQuestionCorrectAnswerDto,
  PaginatedGameHistoryDto,
  PinQuestionCorrectAnswerDto,
  PuzzleQuestionCorrectAnswerDto,
  QuestionType,
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
import { PlayerNotFoundException } from '../../game-core/exceptions'
import {
  GameAnswerRepository,
  GameRepository,
} from '../../game-core/repositories'
import { TaskType } from '../../game-core/repositories/models/schemas'
import { isParticipantHost, isParticipantPlayer } from '../../game-core/utils'
import { GameEventPublisher } from '../../game-event/services'
import {
  buildGameQuitEvent,
  toQuestionTaskAnswer,
} from '../../game-event/utils'
import { GameTaskTransitionScheduler } from '../../game-task/services'
import { rebuildQuestionResultTask } from '../../game-task/utils'
import {
  isMultiChoiceCorrectAnswer,
  isPinCorrectAnswer,
  isPuzzleCorrectAnswer,
  isRangeCorrectAnswer,
  isTrueFalseCorrectAnswer,
  isTypeAnswerCorrectAnswer,
} from '../../game-task/utils/question-answer-type-guards'
import { isQuestionResultTask } from '../../game-task/utils/task-type-guards'
import { QuizRepository } from '../../quiz-core/repositories'
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
    const gameDocument = await this.gameRepository.findGameByIDOrThrow(gameId)

    if (isGameFull(gameDocument.participants)) {
      throw new GameFullException()
    }

    if (!isPlayerUnique(gameDocument.participants, participantId)) {
      throw new PlayerNotUniqueException()
    }

    if (!isNicknameUnique(gameDocument.participants, nickname)) {
      throw new NicknameNotUniqueException(nickname)
    }

    const savedGameDocument = await this.gameRepository.findAndSaveWithLock(
      gameId,
      async (currentDocument) =>
        addPlayerParticipantToGame(currentDocument, participantId, nickname),
    )

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
    } catch (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      error
    ) {
      //suppress error (logged by repository)
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

    return gameDocument.participants.filter(isParticipantPlayer).map(
      ({ participantId, nickname }): GameParticipantPlayerDto => ({
        id: participantId,
        nickname,
      }),
    )
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
        participantToRemove,
        buildGameQuitEvent(savedGameDocument.status),
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

    if (gameDocument.currentTask.status !== 'active') {
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
    const answer = toQuestionTaskAnswer(playerId, submitQuestionAnswerRequest)

    const gameDocument = await this.gameRepository.findGameByIDOrThrow(gameID)

    if (
      gameDocument.currentTask.type !== TaskType.Question ||
      gameDocument.currentTask.status !== 'active'
    ) {
      throw new BadRequestException(
        'Current task is either not of question type or not in active status',
      )
    }

    const playerCount = gameDocument.participants.filter(
      (participant) => participant.type === GameParticipantType.PLAYER,
    ).length

    const result = await this.gameAnswerRepository.submitOnce(
      gameID,
      answer,
      playerCount,
    )

    if (!result.accepted) {
      throw new BadRequestException('Answer already provided')
    }

    // determine if all players have submitted an answer after accepting the current submission
    if (result.answerCount === playerCount) {
      await this.gameTaskTransitionScheduler.scheduleTaskTransition(
        gameDocument,
      )
    } else {
      await this.gameEventPublisher.publish(gameDocument)
    }
  }

  /**
   * Adds a new correct answer to the current question result task.
   *
   * The provided answer is appended to the existing list of correct answers,
   * and the question result task is rebuilt to reflect updated results.
   *
   * @param gameID - The ID of the game to update.
   * @param correctAnswerRequest - The new correct answer to append.
   * @throws {BadRequestException} If the current task is not a `QuestionResult` or not in active status.
   */
  public async addCorrectAnswer(
    gameID: string,
    correctAnswerRequest:
      | MultiChoiceQuestionCorrectAnswerDto
      | RangeQuestionCorrectAnswerDto
      | TrueFalseQuestionCorrectAnswerDto
      | TypeAnswerQuestionCorrectAnswerDto
      | PinQuestionCorrectAnswerDto
      | PuzzleQuestionCorrectAnswerDto,
  ): Promise<void> {
    const gameDocument = await this.gameRepository.findGameByIDOrThrow(gameID)

    if (
      isQuestionResultTask(gameDocument) &&
      gameDocument.currentTask.status === 'active'
    ) {
      gameDocument.currentTask.correctAnswers = [
        ...gameDocument.currentTask.correctAnswers,
        ...(correctAnswerRequest.type === QuestionType.MultiChoice
          ? [
              {
                type: QuestionType.MultiChoice,
                index: correctAnswerRequest.index,
              },
            ]
          : []),
        ...(correctAnswerRequest.type === QuestionType.Range
          ? [
              {
                type: QuestionType.Range,
                value: correctAnswerRequest.value,
              },
            ]
          : []),
        ...(correctAnswerRequest.type === QuestionType.TrueFalse
          ? [
              {
                type: QuestionType.TrueFalse,
                value: correctAnswerRequest.value,
              },
            ]
          : []),
        ...(correctAnswerRequest.type === QuestionType.TypeAnswer
          ? [
              {
                type: QuestionType.TypeAnswer,
                value: correctAnswerRequest.value,
              },
            ]
          : []),
        ...(correctAnswerRequest.type === QuestionType.Pin
          ? [
              {
                type: QuestionType.Pin,
                value: `${correctAnswerRequest.positionX},${correctAnswerRequest.positionY}`,
              },
            ]
          : []),
        ...(correctAnswerRequest.type === QuestionType.Puzzle
          ? [
              {
                type: QuestionType.Puzzle,
                value: correctAnswerRequest.values,
              },
            ]
          : []),
      ]

      const updatedQuestionResultTask = rebuildQuestionResultTask(gameDocument)

      const savedGameDocument = await this.gameRepository.findAndSaveWithLock(
        gameID,
        async (currentDocument) => {
          currentDocument.currentTask = updatedQuestionResultTask
          return currentDocument
        },
      )

      await this.gameEventPublisher.publish(savedGameDocument)
    } else {
      throw new BadRequestException(
        'Current task is either not of question result type or not in active status',
      )
    }
  }

  /**
   * Deletes a specific correct answer from the current question result task.
   *
   * The provided answer is removed from the list of correct answers,
   * and the question result task is rebuilt accordingly.
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
      | TypeAnswerQuestionCorrectAnswerDto
      | PinQuestionCorrectAnswerDto
      | PuzzleQuestionCorrectAnswerDto,
  ): Promise<void> {
    const gameDocument = await this.gameRepository.findGameByIDOrThrow(gameID)

    if (
      isQuestionResultTask(gameDocument) &&
      gameDocument.currentTask.status === 'active'
    ) {
      gameDocument.currentTask.correctAnswers =
        gameDocument.currentTask.correctAnswers.filter((correctAnswer) => {
          const isExistingCorrectMultiChoiceAnswer =
            isMultiChoiceCorrectAnswer(correctAnswer) &&
            correctAnswerRequest.type === QuestionType.MultiChoice &&
            correctAnswer.index === correctAnswerRequest.index

          const isExistingCorrectRangeAnswer =
            isRangeCorrectAnswer(correctAnswer) &&
            correctAnswerRequest.type === QuestionType.Range &&
            correctAnswer.value === correctAnswerRequest.value

          const isExistingCorrectTrueFalseAnswer =
            isTrueFalseCorrectAnswer(correctAnswer) &&
            correctAnswerRequest.type === QuestionType.TrueFalse &&
            correctAnswer.value === correctAnswerRequest.value

          const isExistingCorrectTypeAnswer =
            isTypeAnswerCorrectAnswer(correctAnswer) &&
            correctAnswerRequest.type === QuestionType.TypeAnswer &&
            correctAnswer.value === correctAnswerRequest.value

          const isExistingCorrectPinAnswer =
            isPinCorrectAnswer(correctAnswer) &&
            correctAnswerRequest.type === QuestionType.Pin &&
            correctAnswer.value ===
              `${correctAnswerRequest.positionX},${correctAnswerRequest.positionY}`

          const isExistingCorrectPuzzleAnswer =
            isPuzzleCorrectAnswer(correctAnswer) &&
            correctAnswerRequest.type === QuestionType.Puzzle &&
            correctAnswer.value === correctAnswerRequest.values

          return !(
            isExistingCorrectMultiChoiceAnswer ||
            isExistingCorrectRangeAnswer ||
            isExistingCorrectTrueFalseAnswer ||
            isExistingCorrectTypeAnswer ||
            isExistingCorrectPinAnswer ||
            isExistingCorrectPuzzleAnswer
          )
        })

      const updatedQuestionResultTask = rebuildQuestionResultTask(gameDocument)

      const savedGameDocument = await this.gameRepository.findAndSaveWithLock(
        gameID,
        async (currentDocument) => {
          currentDocument.currentTask = updatedQuestionResultTask
          return currentDocument
        },
      )

      await this.gameEventPublisher.publish(savedGameDocument)
    } else {
      throw new BadRequestException(
        'Current task is either not of question result type or not in active status',
      )
    }
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
      } catch (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        error
      ) {
        //suppress error (logged by repository)
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
    const savedGame = await this.gameRepository.findAndSaveWithLock(
      gameId,
      async (game) => {
        if (game.status !== GameStatus.Terminated) {
          game.status = GameStatus.Terminated
        }
        return game
      },
    )

    await this.gameEventPublisher.publish(savedGame)
  }
}
