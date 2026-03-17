import { GameStatus, shuffleArray } from '@klurigo/common'
import { Injectable } from '@nestjs/common'

import { GameAnswerRepository } from '../../game-core/repositories'
import {
  GameDocument,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import { isParticipantPlayer } from '../../game-core/utils'
import { GameResultService } from '../../game-result/services'
import { isMultiChoiceQuestion } from '../../quiz-core/utils'
import { IllegalTaskTypeException } from '../exceptions'
import {
  buildLeaderboardTask,
  buildPodiumTask,
  buildQuestionResultTask,
  buildQuestionTask,
  updateParticipantsAndBuildLeaderboard,
} from '../utils'

/**
 * Service responsible for determining the appropriate transition delay and callback
 * function for each game task, based on its type and status. Handles Redis-backed
 * state transitions and supports lifecycle management of tasks in the game flow.
 */
@Injectable()
export class GameTaskTransitionService {
  private static AVERAGE_WPM = 220 // Average reading speed in words per minute
  private static MILLISECONDS_PER_MINUTE = 60000
  private static RATIO = 100 // Fallback character-based ratio (milliseconds per character)
  private static MAX_CHARACTER_DURATION = 15000 // Maximum fallback duration in milliseconds

  /**
   * Constructs the GameTaskTransitionService.
   *
   * @param gameAnswerRepository - Repository responsible for reading and clearing current-question answers from Redis.
   * @param gameResultService - Service responsible for creating and retrieving persisted game results.
   */
  constructor(
    private readonly gameAnswerRepository: GameAnswerRepository,
    private readonly gameResultService: GameResultService,
  ) {}

  /**
   * Returns a transition callback function based on the current task type and status.
   * The returned callback performs any required state updates on the game document.
   *
   * @param gameDocument - The game document containing the current task.
   * @returns A bound callback function or undefined if no transition is needed.
   */
  public getTaskTransitionCallback(
    gameDocument: GameDocument,
  ): ((gameDocument: GameDocument) => Promise<void>) | undefined {
    const { type, status } = gameDocument.currentTask
    if (type === TaskType.Lobby) {
      if (status === 'completed') {
        return this.lobbyTaskCompletedCallback.bind(this)
      }
    }
    if (type == TaskType.Question) {
      if (status === 'pending') {
        return this.questionTaskPendingCallback.bind(this)
      }
      if (status === 'completed') {
        return this.questionTaskCompletedCallback.bind(this)
      }
    }
    if (type == TaskType.QuestionResult) {
      if (status === 'completed') {
        return this.questionResultTaskCompletedCallback.bind(this)
      }
    }
    if (type == TaskType.Leaderboard) {
      if (status === 'completed') {
        return this.leaderboardTaskCompletedCallback.bind(this)
      }
    }
    if (type == TaskType.Podium) {
      if (status === 'completed') {
        return this.podiumTaskCompletedCallback.bind(this)
      }
    }
    return undefined
  }

  /**
   * Callback for completing the Lobby task.
   *
   * This function transitions the current task from 'Lobby' to the next task, which is
   * typically the first question task. It moves the current task to the `previousTasks` array
   * and updates `currentTask` with a newly created question task.
   *
   * @param {GameDocument} gameDocument - The game document containing the current task.
   * @private
   */
  private async lobbyTaskCompletedCallback(
    gameDocument: GameDocument,
  ): Promise<void> {
    if (gameDocument.currentTask.type !== TaskType.Lobby) {
      throw new IllegalTaskTypeException(
        gameDocument.currentTask.type,
        TaskType.Lobby,
      )
    }
    const hasNoPlayerParticipants =
      !gameDocument.participants.some(isParticipantPlayer)

    gameDocument.settings.shouldAutoCompleteQuestionResultTask =
      hasNoPlayerParticipants
    gameDocument.settings.shouldAutoCompleteLeaderboardTask =
      hasNoPlayerParticipants
    gameDocument.settings.shouldAutoCompletePodiumTask = hasNoPlayerParticipants

    if (gameDocument.settings.randomizeQuestionOrder) {
      gameDocument.questions = shuffleArray(gameDocument.questions)
    }

    if (gameDocument.settings.randomizeAnswerOrder) {
      gameDocument.questions = gameDocument.questions.map((question) => {
        if (isMultiChoiceQuestion(question)) {
          question.options = shuffleArray(question.options)
        }
        return question
      })
    }

    gameDocument.previousTasks.push(gameDocument.currentTask)
    gameDocument.currentTask = buildQuestionTask(gameDocument)
    gameDocument.nextQuestion = gameDocument.nextQuestion + 1
  }

  /**
   * Sets the `presented` timestamp for a question task during its pending state.
   *
   * @param {GameDocument} gameDocument - The game document containing the current task.
   * @throws {IllegalTaskTypeException} If the current task type is not a question.
   * @private
   */
  private async questionTaskPendingCallback(
    gameDocument: GameDocument,
  ): Promise<void> {
    if (gameDocument.currentTask.type !== TaskType.Question) {
      throw new IllegalTaskTypeException(
        gameDocument.currentTask.type,
        TaskType.QuestionResult,
      )
    }

    gameDocument.currentTask.presented = new Date()
  }

  /**
   * Callback for completing the current question task.
   *
   * This function transitions the current task from a question task to the next task.
   * It moves the current question task to the `previousTasks` array and updates `currentTask`
   * with a newly created question result task.
   *
   * @param {GameDocument} gameDocument - The game document containing the current task.
   * @private
   */
  private async questionTaskCompletedCallback(
    gameDocument: GameDocument,
  ): Promise<void> {
    if (gameDocument.currentTask.type !== TaskType.Question) {
      throw new IllegalTaskTypeException(
        gameDocument.currentTask.type,
        TaskType.Question,
      )
    }

    const answers = await this.gameAnswerRepository.findAllAnswersByGameId(
      gameDocument._id,
    )

    await this.gameAnswerRepository.clear(gameDocument._id)

    gameDocument.currentTask.answers = answers
    gameDocument.previousTasks.push(gameDocument.currentTask)
    gameDocument.currentTask = buildQuestionResultTask(gameDocument)
  }

  /**
   * Callback for completing the current question result task.
   *
   * This function transitions the current task from a question result task to the next task.
   * It moves the current question task to the `previousTasks` array and updates `currentTask`
   * with an either newly created leaderboard or a podium task.
   *
   * @param {GameDocument} gameDocument - The game document containing the current task.
   * @private
   */
  private async questionResultTaskCompletedCallback(
    gameDocument: GameDocument,
  ): Promise<void> {
    if (gameDocument.currentTask.type !== TaskType.QuestionResult) {
      throw new IllegalTaskTypeException(
        gameDocument.currentTask.type,
        TaskType.QuestionResult,
      )
    }

    gameDocument.previousTasks.push(gameDocument.currentTask)

    const leaderboardTaskItems =
      updateParticipantsAndBuildLeaderboard(gameDocument)

    if (gameDocument.nextQuestion < gameDocument.questions.length) {
      gameDocument.currentTask = buildLeaderboardTask(
        gameDocument,
        leaderboardTaskItems,
      )
    } else {
      gameDocument.currentTask = buildPodiumTask(
        gameDocument,
        leaderboardTaskItems,
      )
      await this.gameResultService.createGameResult(gameDocument)
    }
  }

  /**
   * Callback for completing the current leaderboard task.
   *
   * This function transitions the current task from a leaderboard task to the next task.
   * It moves the current question task to the `previousTasks` array and updates `currentTask`
   * with a newly created question task.
   *
   * @param {GameDocument} gameDocument - The game document containing the current task.
   * @private
   */
  private async leaderboardTaskCompletedCallback(
    gameDocument: GameDocument,
  ): Promise<void> {
    if (gameDocument.currentTask.type !== TaskType.Leaderboard) {
      throw new IllegalTaskTypeException(
        gameDocument.currentTask.type,
        TaskType.Leaderboard,
      )
    }

    gameDocument.previousTasks.push(gameDocument.currentTask)
    gameDocument.currentTask = buildQuestionTask(gameDocument)
    gameDocument.nextQuestion = gameDocument.nextQuestion + 1
  }

  /**
   * Handles the completion of the podium task by marking the game as completed.
   *
   * The podium task intentionally remains as `currentTask` so that reconnecting
   * players continue to receive the game-over event and the host receives the
   * quit event based on game status rather than task type.
   *
   * @param {GameDocument} gameDocument - The game document containing the current task.
   *
   * @throws {IllegalTaskTypeException} If the current task type is not `Podium`.
   * @private
   */
  private async podiumTaskCompletedCallback(
    gameDocument: GameDocument,
  ): Promise<void> {
    if (gameDocument.currentTask.type !== TaskType.Podium) {
      throw new IllegalTaskTypeException(
        gameDocument.currentTask.type,
        TaskType.Podium,
      )
    }

    gameDocument.status = GameStatus.Completed
    gameDocument.completedAt = new Date()
  }

  /**
   * Computes the transition delay for the current task based on its type and status.
   * For questions, this may be based on estimated reading time or a configured duration.
   *
   * @param gameDocument - The game document containing the current task.
   * @returns The calculated delay in milliseconds.
   */
  public getTaskTransitionDelay(gameDocument: GameDocument): number {
    const { type, status } = gameDocument.currentTask
    if (type === TaskType.Lobby) {
      if (status === 'pending' || status === 'completed') {
        return 3000
      }
    }
    if (type === TaskType.Question) {
      if (status === 'pending') {
        return this.getQuestionTaskPendingDuration(gameDocument)
      }
      if (status === 'active') {
        return this.getQuestionTaskActiveDuration(gameDocument)
      }
    }
    return 0
  }

  /**
   * Calculates the pending duration for reading the current question text in milliseconds.
   *
   * @param gameDocument - The game document containing the current task and questions.
   *
   * @returns {number} The pending duration in milliseconds.
   *
   * @throws {Error} If the current task type is not 'Question' or the question index is invalid.
   *
   * @private
   */
  private getQuestionTaskPendingDuration(gameDocument: GameDocument): number {
    if (gameDocument.currentTask.type !== TaskType.Question) {
      throw new IllegalTaskTypeException(
        gameDocument.currentTask.type,
        TaskType.Question,
      )
    }

    const questionIndex = gameDocument.currentTask.questionIndex
    if (questionIndex < 0 || questionIndex >= gameDocument.questions.length) {
      throw new Error('Invalid question index')
    }

    const questionText = gameDocument.questions[questionIndex].text

    const wordCount = questionText.trim().split(/\s+/).length
    const readingDuration =
      (wordCount / GameTaskTransitionService.AVERAGE_WPM) *
      GameTaskTransitionService.MILLISECONDS_PER_MINUTE

    const characterDuration = Math.min(
      questionText.length * GameTaskTransitionService.RATIO,
      GameTaskTransitionService.MAX_CHARACTER_DURATION,
    )

    return Math.max(readingDuration, characterDuration)
  }

  /**
   * Retrieves the active duration for the current question task in milliseconds.
   *
   * @param gameDocument - The game document containing the current task and questions.
   *
   * @returns {number} The active duration in milliseconds.
   *
   * @throws {Error} If the current task type is not 'Question' or the question index is invalid.
   *
   * @private
   */
  private getQuestionTaskActiveDuration(gameDocument: GameDocument): number {
    if (gameDocument.currentTask.type !== TaskType.Question) {
      throw new IllegalTaskTypeException(
        gameDocument.currentTask.type,
        TaskType.Question,
      )
    }

    const questionIndex = gameDocument.currentTask.questionIndex
    if (questionIndex < 0 || questionIndex >= gameDocument.questions.length) {
      throw new Error('Invalid question index')
    }

    const durationInSeconds = gameDocument.questions[questionIndex].duration
    return durationInSeconds * 1000
  }
}
