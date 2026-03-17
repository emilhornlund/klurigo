import { QuizRatingAuthorType, QuizRatingDto } from '@klurigo/common'
import { ForbiddenException, Injectable } from '@nestjs/common'

import { GameRepository } from '../../game-core/repositories'
import { isParticipantPlayer } from '../../game-core/utils'
import { isPodiumTask } from '../../game-task/utils/task-type-guards'
import { QuizRepository } from '../../quiz-core/repositories'
import {
  QuizRatingAnonymousAuthorWithBase,
  QuizRatingUserAuthorWithBase,
} from '../../quiz-core/repositories/models/schemas'
import { QuizRatingService } from '../../quiz-rating-api/services'
import { User, UserRepository } from '../../user/repositories'

/**
 * Service that bridges a game-scoped rating request to the shared
 * {@link QuizRatingService}.
 *
 * Resolves the participant identity (logged-in user vs anonymous player),
 * constructs the correct author subdocument, validates quiz ownership, and
 * delegates persistence to {@link QuizRatingService}.
 */
@Injectable()
export class GameRatingService {
  /**
   * Creates a `GameRatingService`.
   *
   * @param gameRepository - Repository for loading game documents.
   * @param quizRepository - Repository for loading quiz documents.
   * @param userRepository - Repository for resolving participants to users.
   * @param quizRatingService - Service for persisting quiz ratings.
   */
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly quizRepository: QuizRepository,
    private readonly userRepository: UserRepository,
    private readonly quizRatingService: QuizRatingService,
  ) {}

  /**
   * Creates or updates a rating for the quiz associated with a game.
   *
   * Resolves the participant to a logged-in user or anonymous player and
   * builds the appropriate author subdocument before delegating to
   * {@link QuizRatingService.createOrUpdateQuizRating}.
   *
   * Logged-in players who own the quiz are forbidden from rating it.
   * Anonymous players are always allowed to rate.
   *
   * @param gameId - The unique identifier of the game.
   * @param participantId - The `sub` claim from the game-scoped JWT, which
   *   equals the userId for authenticated players and a random UUID for
   *   anonymous players.
   * @param stars - Star rating value (1–5).
   * @param comment - Optional feedback comment.
   * @returns The resulting rating DTO.
   * @throws ForbiddenException when the participant is the quiz owner.
   */
  public async createOrUpdateRating(
    gameId: string,
    participantId: string,
    stars: number,
    comment?: string,
  ): Promise<QuizRatingDto> {
    const game = await this.gameRepository.findGameByIDOrThrow(gameId, false)

    if (!isPodiumTask(game)) {
      throw new ForbiddenException(
        'Ratings can only be created or updated during the podium task.',
      )
    }

    const quiz = await this.quizRepository.findQuizByIdOrThrow(
      String(game.quiz._id),
    )

    const user: User | null =
      await this.userRepository.findUserById(participantId)

    let author: QuizRatingUserAuthorWithBase | QuizRatingAnonymousAuthorWithBase

    if (user !== null) {
      if (String(quiz.owner._id) === participantId) {
        throw new ForbiddenException(
          'Quiz owners are not allowed to rate their own quiz.',
        )
      }

      author = {
        type: QuizRatingAuthorType.User,
        user,
      } as QuizRatingUserAuthorWithBase
    } else {
      const participant = game.participants.find(
        (p) => isParticipantPlayer(p) && p.participantId === participantId,
      )

      const nickname = isParticipantPlayer(participant)
        ? participant.nickname
        : participantId

      author = {
        type: QuizRatingAuthorType.Anonymous,
        participantId,
        nickname,
      } as QuizRatingAnonymousAuthorWithBase
    }

    return this.quizRatingService.createOrUpdateQuizRating(
      quiz._id,
      author,
      stars,
      comment,
    )
  }
}
