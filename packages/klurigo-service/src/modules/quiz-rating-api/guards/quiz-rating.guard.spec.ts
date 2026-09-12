import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { GameRepository } from '../../game-core/repositories'
import { QuizRepository } from '../../quiz-core/repositories'

import { QuizRatingGuard } from './quiz-rating.guard'

describe('QuizRatingGuard', () => {
  let guard: QuizRatingGuard

  type HasRateableGamesFn =
    GameRepository['hasRateableGamesByQuizIdAndParticipantId']

  const hasRateableGamesByQuizIdAndParticipantId: jest.MockedFunction<HasRateableGamesFn> =
    jest.fn()

  const gameRepository: Pick<
    GameRepository,
    'hasRateableGamesByQuizIdAndParticipantId'
  > = {
    hasRateableGamesByQuizIdAndParticipantId:
      hasRateableGamesByQuizIdAndParticipantId,
  }

  type FindQuizByIdOrThrowFn = QuizRepository['findQuizByIdOrThrow']

  const findQuizByIdOrThrow: jest.MockedFunction<FindQuizByIdOrThrowFn> =
    jest.fn()

  const quizRepository: Pick<QuizRepository, 'findQuizByIdOrThrow'> = {
    findQuizByIdOrThrow,
  }

  const buildContext = (request: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext

  beforeEach(async () => {
    jest.clearAllMocks()

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuizRatingGuard,
        {
          provide: QuizRepository,
          useValue: quizRepository,
        },
        {
          provide: GameRepository,
          useValue: gameRepository,
        },
      ],
    }).compile()

    guard = moduleRef.get(QuizRatingGuard)
  })

  it('throws UnauthorizedException when request.user._id is missing', async () => {
    const context = buildContext({
      user: undefined,
      params: { quizId: 'quiz-1' },
    })

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )

    expect(findQuizByIdOrThrow).not.toHaveBeenCalled()
    expect(hasRateableGamesByQuizIdAndParticipantId).not.toHaveBeenCalled()
  })

  it('throws BadRequestException when quizId route param is missing', async () => {
    const context = buildContext({
      user: { _id: 'user-1' },
      params: {},
    })

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      BadRequestException,
    )

    expect(findQuizByIdOrThrow).not.toHaveBeenCalled()
    expect(hasRateableGamesByQuizIdAndParticipantId).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when user is the quiz owner', async () => {
    findQuizByIdOrThrow.mockResolvedValueOnce({
      owner: { _id: 'user-1' },
    } as never)

    const context = buildContext({
      user: { _id: 'user-1' },
      params: { quizId: 'quiz-1' },
    })

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    )

    expect(findQuizByIdOrThrow).toHaveBeenCalledTimes(1)
    expect(findQuizByIdOrThrow).toHaveBeenCalledWith('quiz-1')

    expect(hasRateableGamesByQuizIdAndParticipantId).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when user has no rateable games for the quiz', async () => {
    findQuizByIdOrThrow.mockResolvedValueOnce({
      owner: { _id: 'owner-1' },
    } as never)
    hasRateableGamesByQuizIdAndParticipantId.mockResolvedValueOnce(false)

    const context = buildContext({
      user: { _id: 'user-1' },
      params: { quizId: 'quiz-1' },
    })

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    )

    expect(findQuizByIdOrThrow).toHaveBeenCalledTimes(1)
    expect(findQuizByIdOrThrow).toHaveBeenCalledWith('quiz-1')

    expect(hasRateableGamesByQuizIdAndParticipantId).toHaveBeenCalledTimes(1)
    expect(hasRateableGamesByQuizIdAndParticipantId).toHaveBeenCalledWith(
      'quiz-1',
      'user-1',
    )
  })

  it('returns true when user has rateable games for the quiz', async () => {
    findQuizByIdOrThrow.mockResolvedValueOnce({
      owner: { _id: 'owner-1' },
    } as never)
    hasRateableGamesByQuizIdAndParticipantId.mockResolvedValueOnce(true)

    const context = buildContext({
      user: { _id: 'user-1' },
      params: { quizId: 'quiz-1' },
    })

    await expect(guard.canActivate(context)).resolves.toBe(true)

    expect(findQuizByIdOrThrow).toHaveBeenCalledTimes(1)
    expect(findQuizByIdOrThrow).toHaveBeenCalledWith('quiz-1')

    expect(hasRateableGamesByQuizIdAndParticipantId).toHaveBeenCalledTimes(1)
    expect(hasRateableGamesByQuizIdAndParticipantId).toHaveBeenCalledWith(
      'quiz-1',
      'user-1',
    )
  })
})
