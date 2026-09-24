import {
  AuthProvider,
  GameMode,
  GameParticipantType,
  QuestionType,
} from '@klurigo/common'
import type { INestApplication } from '@nestjs/common'
import {
  DocumentBuilder,
  OpenAPIObject,
  ReferenceObject,
  SchemaObject,
  SwaggerModule,
} from '@nestjs/swagger'
import { Test } from '@nestjs/testing'

import { AuthController } from '../../modules/authentication/controllers'
import { DiscoveryController } from '../../modules/discovery-api/controllers'
import {
  GameController,
  GameRatingController,
  GameSettingsController,
  ProfileGameController,
  QuizGameController,
} from '../../modules/game-api/controllers'
import { GameAuthenticationController } from '../../modules/game-authentication/controllers'
import { GameResultController } from '../../modules/game-result/controllers'
import { HealthController } from '../../modules/health/controllers'
import { MediaController } from '../../modules/media/controllers'
import {
  ProfileQuizController,
  QuizController,
} from '../../modules/quiz-api/controllers'
import { ProfileQuizRatingController } from '../../modules/quiz-rating-api/controllers/profile-quiz-rating.controller'
import { QuizRatingController } from '../../modules/quiz-rating-api/controllers/quiz-rating.controller'
import {
  UserAuthController,
  UserController,
  UserProfileController,
} from '../../modules/user/controllers'
import { PublicUserController } from '../../modules/user-profile-api/controllers'
import { AppController } from '../controllers'

import { createOpenApiConfig } from './openapi.config'

const HTTP_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
] as const

const PUBLIC_OPERATIONS = new Set([
  'GET /health',
  'GET /health/ready',
  'GET /health/live',
  'GET /debug-sentry',
  'POST /auth/login',
  'POST /auth/google/exchange',
  'POST /auth/refresh',
  'POST /auth/revoke',
  'POST /auth/game',
  'POST /auth/password/forgot',
  'POST /users',
])

const COMMON_ERROR_STATUSES = [
  '400',
  '401',
  '403',
  '404',
  '409',
  '410',
  '422',
  '429',
  '500',
  '503',
]

const OPENAPI_CONTROLLERS = [
  AppController,
  AuthController,
  DiscoveryController,
  GameAuthenticationController,
  GameController,
  GameRatingController,
  GameResultController,
  GameSettingsController,
  HealthController,
  MediaController,
  ProfileGameController,
  ProfileQuizController,
  ProfileQuizRatingController,
  PublicUserController,
  QuizController,
  QuizGameController,
  QuizRatingController,
  UserAuthController,
  UserController,
  UserProfileController,
]

function getSchema(document: OpenAPIObject, name: string): SchemaObject {
  const schema = document.components?.schemas?.[name]
  if (!schema || '$ref' in schema) throw new Error(`Missing schema: ${name}`)
  return schema
}

function getRequestSchema(
  document: OpenAPIObject,
  path: string,
  method: 'post' | 'put',
): SchemaObject {
  const requestBody = document.paths[path]?.[method]?.requestBody
  if (!requestBody || '$ref' in requestBody)
    throw new Error('Missing request body')
  const schema = requestBody.content['application/json']?.schema
  if (!schema || '$ref' in schema) throw new Error('Missing request schema')
  return schema
}

function expectDiscriminator(
  schema: SchemaObject,
  propertyName: string,
  mapping: Record<string, string>,
) {
  expect(schema.oneOf).toBeDefined()
  expect(schema.discriminator).toEqual({ propertyName, mapping })
}

function getItemsSchema(schema: SchemaObject | ReferenceObject | undefined) {
  if (!schema || '$ref' in schema || !schema.items || '$ref' in schema.items) {
    throw new Error('Missing inline array item schema')
  }
  return schema.items
}

describe('generated OpenAPI contract', () => {
  let app: INestApplication | undefined
  let document: OpenAPIObject

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      controllers: OPENAPI_CONTROLLERS,
    })
      .useMocker(() => ({}))
      .compile()
    const nestApp = testingModule.createNestApplication()
    app = nestApp
    document = SwaggerModule.createDocument(nestApp, createOpenApiConfig())
  })

  afterAll(async () => {
    await app?.close()
  })

  it('has intentional API metadata and a documented bearer scheme', () => {
    expect(document.info).toMatchObject({
      title: 'Klurigo API',
      description: expect.stringContaining('HTTP API'),
      version: '1.0.0',
    })
    expect(document.tags).toEqual(
      expect.arrayContaining(
        [
          'auth',
          'discovery',
          'game',
          'health',
          'media',
          'profile',
          'quiz',
          'user',
        ].map((name) =>
          expect.objectContaining({ name, description: expect.any(String) }),
        ),
      ),
    )
    expect(document.components?.securitySchemes?.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
  })

  it('gives every operation a summary and documented tags', () => {
    const documentedTags = new Set(
      (document.tags ?? []).map(({ name }) => name),
    )

    for (const [path, pathItem] of Object.entries(document.paths)) {
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method]
        if (!operation) continue

        expect(operation.summary).toBeTruthy()
        expect(operation.tags).toBeDefined()
        for (const tag of operation.tags ?? []) {
          expect(documentedTags.has(tag)).toBe(true)
        }
        expect(operation.responses).toBeDefined()
        expect(`${method.toUpperCase()} ${path}`).toBeTruthy()
      }
    }
  })

  it('represents every path template parameter as a required path parameter', () => {
    for (const [path, pathItem] of Object.entries(document.paths)) {
      const pathParameters =
        path.match(/{[^}]+}/g)?.map((parameter) => parameter.slice(1, -1)) ?? []
      if (pathParameters.length === 0) continue

      for (const method of HTTP_METHODS) {
        const operation = pathItem[method]
        if (!operation) continue
        const parameters = [
          ...(pathItem.parameters ?? []),
          ...(operation.parameters ?? []),
        ]
        for (const parameterName of pathParameters) {
          expect(parameters).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                name: parameterName,
                in: 'path',
                required: true,
              }),
            ]),
          )
        }
      }
    }
  })

  it('does not define content for 204 responses', () => {
    for (const pathItem of Object.values(document.paths)) {
      for (const method of HTTP_METHODS) {
        const response = pathItem[method]?.responses['204']
        if (!response || '$ref' in response) continue
        expect(response.content).toBeUndefined()
      }
    }
  })

  it('matches runtime public routes and bearer-protected routes', () => {
    for (const [path, pathItem] of Object.entries(document.paths)) {
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method]
        if (!operation) continue
        const key = `${method.toUpperCase()} ${path}`
        if (PUBLIC_OPERATIONS.has(key)) {
          expect(operation.security ?? []).toEqual([])
        } else {
          expect({ key, security: operation.security }).toEqual({
            key,
            security: [{ bearer: [] }],
          })
        }
      }
    }
  })

  it('uses the shared error schema for common error responses', () => {
    for (const [path, pathItem] of Object.entries(document.paths)) {
      for (const method of HTTP_METHODS) {
        const responses = pathItem[method]?.responses ?? {}
        for (const status of COMMON_ERROR_STATUSES) {
          const response = responses[status]
          if (!response || '$ref' in response) continue
          // Terminus returns its dependency health report rather than ErrorResponse.
          if (path.startsWith('/health') && status === '503') continue
          const schema = response.content?.['application/json']?.schema
          expect(schema).toBeDefined()
          expect({ path, method, status, schema }).toEqual({
            path,
            method,
            status,
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          })
        }
      }
    }
  })

  it('documents quiz and question polymorphism with stable discriminators', () => {
    const quizModes = {
      [GameMode.Classic]: '#/components/schemas/QuizClassicRequest',
      [GameMode.ZeroToOneHundred]:
        '#/components/schemas/QuizZeroToOneHundredRequest',
    }
    for (const path of ['/quizzes', '/quizzes/{quizId}']) {
      expectDiscriminator(
        getRequestSchema(document, path, path === '/quizzes' ? 'post' : 'put'),
        'mode',
        quizModes,
      )
    }

    const questions = getSchema(document, 'QuizClassicRequest').properties
      ?.questions
    expect(questions).toBeDefined()
    expect(questions).not.toHaveProperty('oneOf')
    expectDiscriminator(getItemsSchema(questions), 'type', {
      [QuestionType.MultiChoice]: '#/components/schemas/QuestionMultiChoice',
      [QuestionType.Range]: '#/components/schemas/QuestionRange',
      [QuestionType.TrueFalse]: '#/components/schemas/QuestionTrueFalse',
      [QuestionType.TypeAnswer]: '#/components/schemas/QuestionTypeAnswer',
      [QuestionType.Pin]: '#/components/schemas/QuestionPin',
      [QuestionType.Puzzle]: '#/components/schemas/QuestionPuzzle',
    })

    const questionResponse =
      document.paths['/quizzes/{quizId}/questions']?.get?.responses['200']
    if (!questionResponse || '$ref' in questionResponse)
      throw new Error('Missing question response')
    const questionResponseSchema =
      questionResponse.content?.['application/json']?.schema
    if (!questionResponseSchema || '$ref' in questionResponseSchema)
      throw new Error('Missing question response schema')
    expectDiscriminator(getItemsSchema(questionResponseSchema), 'type', {
      [QuestionType.MultiChoice]: '#/components/schemas/QuestionMultiChoice',
      [QuestionType.Range]: '#/components/schemas/QuestionRange',
      [QuestionType.TrueFalse]: '#/components/schemas/QuestionTrueFalse',
      [QuestionType.TypeAnswer]: '#/components/schemas/QuestionTypeAnswer',
      [QuestionType.Pin]: '#/components/schemas/QuestionPin',
      [QuestionType.Puzzle]: '#/components/schemas/QuestionPuzzle',
    })
  })

  it('documents answer and game-result polymorphism with stable discriminators', () => {
    const answerSchema = getRequestSchema(
      document,
      '/games/{gameID}/answers',
      'post',
    )
    expectDiscriminator(answerSchema, 'type', {
      [QuestionType.MultiChoice]:
        '#/components/schemas/SubmitMultiChoiceQuestionAnswerRequest',
      [QuestionType.Range]:
        '#/components/schemas/SubmitRangeQuestionAnswerRequest',
      [QuestionType.TrueFalse]:
        '#/components/schemas/SubmitTrueFalseQuestionAnswerRequest',
      [QuestionType.TypeAnswer]:
        '#/components/schemas/SubmitTypeAnswerQuestionAnswerRequest',
      [QuestionType.Pin]: '#/components/schemas/SubmitPinQuestionAnswerRequest',
      [QuestionType.Puzzle]:
        '#/components/schemas/SubmitPuzzleQuestionAnswerRequest',
    })

    const resultResponse =
      document.paths['/games/{gameID}/results']?.get?.responses['200']
    if (!resultResponse || '$ref' in resultResponse)
      throw new Error('Missing game result response')
    const resultSchema = resultResponse.content?.['application/json']?.schema
    if (!resultSchema || '$ref' in resultSchema)
      throw new Error('Missing game result schema')
    expectDiscriminator(resultSchema, 'mode', {
      [GameMode.Classic]: '#/components/schemas/GameResultClassicModeResponse',
      [GameMode.ZeroToOneHundred]:
        '#/components/schemas/GameResultZeroToOneHundredModeResponse',
    })

    const historyResults = getSchema(document, 'PaginatedGameHistoryResponse')
      .properties?.results
    expectDiscriminator(getItemsSchema(historyResults), 'participantType', {
      [GameParticipantType.HOST]:
        '#/components/schemas/GameHistoryHostResponse',
      [GameParticipantType.PLAYER]:
        '#/components/schemas/GameHistoryPlayerResponse',
    })

    const profileSchema = getRequestSchema(document, '/profile/user', 'put')
    expectDiscriminator(profileSchema, 'authProvider', {
      [AuthProvider.Local]:
        '#/components/schemas/UpdateLocalUserProfileRequest',
      [AuthProvider.Google]:
        '#/components/schemas/UpdateGoogleUserProfileRequest',
    })
  })

  it('can still create a document with the standard builder API', () => {
    if (!app) throw new Error('OpenAPI test application was not created')
    expect(
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('Smoke test').build(),
      ).openapi,
    ).toBe('3.0.0')
  })
})
