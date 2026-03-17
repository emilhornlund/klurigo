import { GameEvent, GameParticipantType } from '@klurigo/common'
import { Injectable } from '@nestjs/common'

import { GameAnswerRepository } from '../../game-core/repositories'
import {
  GameDocument,
  Participant,
  QuestionTaskAnswer,
  TaskType,
} from '../../game-core/repositories/models/schemas'
import {
  QuizRatingRepository,
  QuizRepository,
} from '../../quiz-core/repositories'
import { UserRepository } from '../../user/repositories'
import { GameEventMetaData } from '../models'
import {
  buildHostGameEvent,
  buildPlayerGameEvent,
  toGameEventMetaData,
  toPlayerQuestionPlayerEventMetaData,
} from '../utils'

/**
 * Shared inputs reused while constructing participant-specific events for the
 * same game update.
 *
 * The context lets callers fetch answers and compute the common metadata once,
 * then reuse that state across host/player event construction.
 */
type GameParticipantEventBuildContext = {
  readonly answers: QuestionTaskAnswer[]
  readonly metaData: Partial<GameEventMetaData>
}

/**
 * Builds participant-specific game events from a game document and the
 * repository-backed metadata needed to enrich those events.
 *
 * This service centralizes the orchestration that used to be duplicated between
 * the publisher and subscriber: loading answers, computing shared metadata,
 * attaching question-specific player metadata, and enriching podium player
 * events with quiz-rating information.
 */
@Injectable()
export class GameParticipantEventBuilder {
  /**
   * Creates a new shared participant event builder.
   *
   * @param gameAnswerRepository - Repository used to load current-question answers for the game.
   * @param quizRepository - Repository used to load the quiz for podium ownership checks.
   * @param quizRatingRepository - Repository used to load existing ratings for podium enrichment.
   * @param userRepository - Repository used to distinguish anonymous from logged-in participants.
   */
  constructor(
    private readonly gameAnswerRepository: GameAnswerRepository,
    private readonly quizRepository: QuizRepository,
    private readonly quizRatingRepository: QuizRatingRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Creates reusable event-building context for a game document.
   *
   * The shared context prevents re-fetching answers and re-computing base metadata
   * when multiple participant-specific events are built for the same game update.
   *
   * @param document - The game document to build shared context for.
   * @returns Shared answers and base metadata for participant event construction.
   */
  public async createContext(
    document: GameDocument,
  ): Promise<GameParticipantEventBuildContext> {
    const answers = await this.gameAnswerRepository.findAllAnswersByGameId(
      document._id,
    )

    return {
      answers,
      metaData: toGameEventMetaData(answers, {}, document.participants),
    }
  }

  /**
   * Builds the game event for a single participant.
   *
   * @param document - The game document to build from.
   * @param participant - The participant receiving the event.
   * @param context - Optional precomputed shared context for the same game update.
   * @returns The participant-specific game event.
   */
  public async buildParticipantEvent(
    document: GameDocument,
    participant: Participant,
    context?: GameParticipantEventBuildContext,
  ): Promise<GameEvent> {
    const buildContext = context ?? (await this.createContext(document))

    if (participant.type === GameParticipantType.HOST) {
      return buildHostGameEvent(document, buildContext.metaData)
    }

    const metaData = await this.buildPlayerMetaData(
      document,
      participant,
      buildContext,
    )

    return buildPlayerGameEvent(document, participant, metaData)
  }

  /**
   * Builds player-specific metadata by augmenting the shared base metadata with
   * task-specific enrichment.
   *
   * @param document - The game document being rendered.
   * @param participant - The player receiving the event.
   * @param context - Shared answers and base metadata for the current game update.
   * @returns Player-specific metadata for the event utils.
   */
  private async buildPlayerMetaData(
    document: GameDocument,
    participant: Extract<Participant, { type: GameParticipantType.PLAYER }>,
    context: GameParticipantEventBuildContext,
  ): Promise<Partial<GameEventMetaData>> {
    return {
      ...context.metaData,
      ...(document.currentTask.type === TaskType.Question
        ? toPlayerQuestionPlayerEventMetaData(context.answers, participant)
        : {}),
      ...(document.currentTask.type === TaskType.Podium
        ? await this.enrichPodiumPlayerMetaData(
            document,
            participant.participantId,
          )
        : {}),
    }
  }

  /**
   * Enriches metadata with podium-specific rating fields for a player participant.
   *
   * Determines whether the participant is a logged-in user by attempting a User lookup
   * using their `participantId` (for logged-in players `participantId === userId`).
   * Anonymous players always have `podiumCanRateQuiz = true`. Logged-in players are
   * blocked from rating their own quiz (`podiumCanRateQuiz = false` when they own it).
   *
   * Also looks up any existing rating so the game-over screen can pre-populate the
   * rating UI with the participant's current stars and comment.
   *
   * @param document - The game document whose current task is Podium.
   * @param participantId - The participant ID of the player requesting the event.
   * @returns A partial metadata object with `podiumCanRateQuiz` always set, and
   *          `podiumRatingStars` / `podiumRatingComment` set when a prior rating exists.
   */
  private async enrichPodiumPlayerMetaData(
    document: GameDocument,
    participantId: string,
  ): Promise<
    Pick<
      GameEventMetaData,
      'podiumCanRateQuiz' | 'podiumRatingStars' | 'podiumRatingComment'
    >
  > {
    const quizId = document.quiz._id

    const [quiz, user] = await Promise.all([
      this.quizRepository.findQuizByIdOrThrow(quizId),
      this.userRepository.findUserById(participantId),
    ])

    const isLoggedIn = user !== null

    const podiumCanRateQuiz = isLoggedIn
      ? String(quiz.owner._id) !== participantId
      : true

    const existingRating = isLoggedIn
      ? await this.quizRatingRepository.findQuizRatingByUserAuthor(
          quizId,
          participantId,
        )
      : await this.quizRatingRepository.findQuizRatingByAnonymousAuthor(
          quizId,
          participantId,
        )

    return {
      podiumCanRateQuiz,
      ...(existingRating
        ? {
            podiumRatingStars: existingRating.stars,
            podiumRatingComment: existingRating.comment,
          }
        : {}),
    }
  }
}
