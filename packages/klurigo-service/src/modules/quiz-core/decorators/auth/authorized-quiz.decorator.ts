import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
  SetMetadata,
  UseGuards,
} from '@nestjs/common'

import { AUTHORIZED_QUIZ_ALLOW_PUBLIC } from '../../../../app/shared/auth'
import { QuizAuthGuard } from '../../guards'
import type { QuizAuthRequest } from '../../guards/quiz-auth.guard'

/**
 * Decorator for authorizing quiz-related requests.
 *
 * Applies the `QuizAuthGuard` to ensure the user has the appropriate permissions
 * to access or modify a quiz resource.
 *
 * @param options.allowPublic - If `true`, allows access to public quizzes even if the user is not the owner.
 *                              If `false`, only the quiz owner can access private quizzes.
 *
 * @returns {MethodDecorator} The method decorator to apply guards.
 */
export function AuthorizedQuiz(
  options: { allowPublic: boolean } = { allowPublic: false },
): MethodDecorator {
  return applyDecorators(
    SetMetadata(AUTHORIZED_QUIZ_ALLOW_PUBLIC, options.allowPublic),
    UseGuards(QuizAuthGuard),
  )
}

/** Returns the same quiz snapshot checked by `@AuthorizedQuiz`. */
export const AuthorizedQuizDocument = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const { authorizedQuiz } = context
      .switchToHttp()
      .getRequest<QuizAuthRequest>()
    if (!authorizedQuiz) {
      throw new InternalServerErrorException('Authorized quiz is missing')
    }
    return authorizedQuiz
  },
)
