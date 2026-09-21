import {
  LanguageCode,
  MediaType,
  QuestionImageRevealEffectType,
  QuizVisibility,
} from '@klurigo/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import {
  createMockClassicQuizRequestDto,
  createMockQuestionMediaDto,
  createMockQuestionMultiChoiceDto,
} from '../../../../../test-utils/data'

import {
  QuestionAudioMedia,
  QuestionImageMedia,
  QuestionVideoMedia,
} from './question-media'
import { QuestionMultiChoice } from './question-multi-choice'
import { QuizClassicRequest } from './quiz-classic.request'

describe('QuizRequest', () => {
  it('should pass validation with valid data', async () => {
    const response = plainToInstance(
      QuizClassicRequest,
      createMockClassicQuizRequestDto(),
    )
    const errors = await validate(response, { whitelist: true })
    expect(errors).toHaveLength(0)
  })

  it('should fail if `title` is too short', async () => {
    const response = plainToInstance(
      QuizClassicRequest,
      createMockClassicQuizRequestDto({
        title: 'Hi',
      }),
    )
    const errors = await validate(response)
    expect(errors).toHaveLength(1)
    expect(errors[0].property).toBe('title')
    expect(errors[0].constraints?.minLength).toBeDefined()
  })

  it('should fail if `title` exceeds the maximum length', async () => {
    const response = plainToInstance(
      QuizClassicRequest,
      createMockClassicQuizRequestDto({ title: 'A'.repeat(96) }),
    )
    const errors = await validate(response)
    expect(errors).toHaveLength(1)
    expect(errors[0].property).toBe('title')
    expect(errors[0].constraints?.maxLength).toBeDefined()
  })

  it('should fail if `title` does not match the regex pattern', async () => {
    const response = plainToInstance(
      QuizClassicRequest,
      createMockClassicQuizRequestDto({ title: 'Invalid\nTitle' }),
    )
    const errors = await validate(response)
    expect(errors).toHaveLength(1)
    expect(errors[0].property).toBe('title')
    expect(errors[0].constraints?.matches).toBeDefined()
  })

  it('should fail if `description` exceeds 500 characters', async () => {
    const response = plainToInstance(
      QuizClassicRequest,
      createMockClassicQuizRequestDto({ description: 'A'.repeat(501) }),
    )
    const errors = await validate(response)
    expect(errors).toHaveLength(1)
    expect(errors[0].property).toBe('description')
    expect(errors[0].constraints?.maxLength).toBeDefined()
  })

  it('should pass if `description` is optional', async () => {
    const response = plainToInstance(
      QuizClassicRequest,
      createMockClassicQuizRequestDto({
        description: undefined,
      }),
    )
    const errors = await validate(response)
    expect(errors).toHaveLength(0)
  })

  it('should fail if `visibility` is not valid', async () => {
    const response = plainToInstance(
      QuizClassicRequest,
      createMockClassicQuizRequestDto({
        visibility: 'not-valid' as QuizVisibility,
      }),
    )
    const errors = await validate(response)
    expect(errors).toHaveLength(1)
    expect(errors[0].property).toBe('visibility')
  })

  it('should pass if `imageCoverURL` is optional', async () => {
    const response = plainToInstance(
      QuizClassicRequest,
      createMockClassicQuizRequestDto({ imageCoverURL: undefined }),
    )
    const errors = await validate(response)
    expect(errors).toHaveLength(0)
  })

  it('should fail if `imageCoverURL` is not a valid URL', async () => {
    const response = plainToInstance(
      QuizClassicRequest,
      createMockClassicQuizRequestDto({ imageCoverURL: 'not-a-valid-url' }),
    )
    const errors = await validate(response)
    expect(errors).toHaveLength(1)
    expect(errors[0].property).toBe('imageCoverURL')
  })

  it('should fail if `languageCode` is not a valid enum value', async () => {
    const response = plainToInstance(
      QuizClassicRequest,
      createMockClassicQuizRequestDto({
        languageCode: 'INVALID_LANGUAGE' as LanguageCode,
      }),
    )
    const errors = await validate(response)
    expect(errors).toHaveLength(1)
    expect(errors[0].property).toBe('languageCode')
  })

  it('should pass validation with media effect', async () => {
    const dataWithEffect = createMockClassicQuizRequestDto({
      questions: [
        createMockQuestionMultiChoiceDto({
          media: createMockQuestionMediaDto({
            effect: QuestionImageRevealEffectType.Square3x3,
          }),
        }),
      ],
    })
    const response = plainToInstance(QuizClassicRequest, dataWithEffect)
    const errors = await validate(response, { whitelist: true })
    expect(errors).toHaveLength(0)

    expect(response.questions[0]).toBeInstanceOf(QuestionMultiChoice)
    const question = response.questions[0] as QuestionMultiChoice
    expect(question.media).toBeDefined()
    expect(question.media).toBeInstanceOf(QuestionImageMedia)
    const media = question.media as QuestionImageMedia
    expect(media.effect).toBe(QuestionImageRevealEffectType.Square3x3)
  })

  it('should pass validation for audio media', async () => {
    const data = createMockClassicQuizRequestDto({
      questions: [
        createMockQuestionMultiChoiceDto({
          media: createMockQuestionMediaDto({
            type: MediaType.Audio,
          }),
        }),
      ],
    })
    const response = plainToInstance(QuizClassicRequest, data)
    const errors = await validate(response, { whitelist: true })
    expect(errors).toHaveLength(0)

    expect(response.questions[0]).toBeInstanceOf(QuestionMultiChoice)
    const question = response.questions[0] as QuestionMultiChoice
    expect(question.media).toBeDefined()
    expect(question.media).toBeInstanceOf(QuestionAudioMedia)
  })

  it('should pass validation for video media', async () => {
    const data = createMockClassicQuizRequestDto({
      questions: [
        createMockQuestionMultiChoiceDto({
          media: createMockQuestionMediaDto({
            type: MediaType.Video,
          }),
        }),
      ],
    })
    const response = plainToInstance(QuizClassicRequest, data)
    const errors = await validate(response, { whitelist: true })
    expect(errors).toHaveLength(0)

    expect(response.questions[0]).toBeInstanceOf(QuestionMultiChoice)
    const question = response.questions[0] as QuestionMultiChoice
    expect(question.media).toBeDefined()
    expect(question.media).toBeInstanceOf(QuestionVideoMedia)
  })
})
