import { QuestionType } from '@klurigo/common'
import { BadRequestException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { ValidationException } from '../../../app/exceptions'
import {
  MultiChoiceQuestionCorrectAnswerRequest,
  PinQuestionCorrectAnswerRequest,
  PuzzleQuestionCorrectAnswerRequest,
  RangeQuestionCorrectAnswerRequest,
  TrueFalseQuestionCorrectAnswerRequest,
  TypeAnswerQuestionCorrectAnswerRequest,
} from '../controllers/models/requests'

import { ParseCorrectAnswerRequestPipe } from './parse-correct-answer-request.pipe'

jest.mock('class-transformer', () => {
  const actual = jest.requireActual('class-transformer')
  return {
    ...actual,
    plainToInstance: jest.fn(),
  }
})

jest.mock('class-validator', () => {
  const actual = jest.requireActual('class-validator')
  return {
    ...actual,
    validate: jest.fn(),
  }
})

describe('ParseCorrectAnswerRequestPipe', () => {
  let pipe: ParseCorrectAnswerRequestPipe

  const plainToInstanceMock = plainToInstance as jest.MockedFunction<
    typeof plainToInstance
  >
  const validateMock = validate as jest.MockedFunction<typeof validate>

  beforeEach(() => {
    pipe = new ParseCorrectAnswerRequestPipe()
    jest.resetAllMocks()
  })

  it('should be defined', () => {
    expect(pipe).toBeDefined()
  })

  describe('Valid requests', () => {
    it('should transform MultiChoice correct answer requests', async () => {
      const value = { type: QuestionType.MultiChoice, foo: 'bar' }
      const instance = { __type: 'multi' }

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue([])

      await expect(pipe.transform(value, {} as any)).resolves.toBe(instance)

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        MultiChoiceQuestionCorrectAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })

    it('should transform Range correct answer requests', async () => {
      const value = { type: QuestionType.Range, foo: 'bar' }
      const instance = { __type: 'range' }

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue([])

      await expect(pipe.transform(value, {} as any)).resolves.toBe(instance)

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        RangeQuestionCorrectAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })

    it('should transform TrueFalse correct answer requests', async () => {
      const value = { type: QuestionType.TrueFalse, foo: 'bar' }
      const instance = { __type: 'truefalse' }

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue([])

      await expect(pipe.transform(value, {} as any)).resolves.toBe(instance)

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        TrueFalseQuestionCorrectAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })

    it('should transform TypeAnswer correct answer requests', async () => {
      const value = { type: QuestionType.TypeAnswer, foo: 'bar' }
      const instance = { __type: 'typeanswer' }

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue([])

      await expect(pipe.transform(value, {} as any)).resolves.toBe(instance)

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        TypeAnswerQuestionCorrectAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })

    it('should transform Pin correct answer requests', async () => {
      const value = { type: QuestionType.Pin, foo: 'bar' }
      const instance = { __type: 'pin' }

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue([])

      await expect(pipe.transform(value, {} as any)).resolves.toBe(instance)

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        PinQuestionCorrectAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })

    it('should transform Puzzle correct answer requests', async () => {
      const value = { type: QuestionType.Puzzle, foo: 'bar' }
      const instance = { __type: 'puzzle' }

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue([])

      await expect(pipe.transform(value, {} as any)).resolves.toBe(instance)

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        PuzzleQuestionCorrectAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })
  })

  describe('Invalid requests', () => {
    it('should throw BadRequestException when type is unknown', async () => {
      const value = { type: 'UnknownType', foo: 'bar' }

      await expect(pipe.transform(value, {} as any)).rejects.toThrow(
        BadRequestException,
      )

      expect(plainToInstanceMock).not.toHaveBeenCalled()
      expect(validateMock).not.toHaveBeenCalled()
    })

    it('should throw BadRequestException when type is missing', async () => {
      const value = { foo: 'bar' }

      await expect(pipe.transform(value as any, {} as any)).rejects.toThrow(
        BadRequestException,
      )

      expect(plainToInstanceMock).not.toHaveBeenCalled()
      expect(validateMock).not.toHaveBeenCalled()
    })

    it.each([null, [], undefined])(
      'should throw BadRequestException for a non-object request body (%p)',
      async (value) => {
        await expect(
          pipe.transform(value as any, {} as any),
        ).rejects.toBeInstanceOf(BadRequestException)

        expect(plainToInstanceMock).not.toHaveBeenCalled()
        expect(validateMock).not.toHaveBeenCalled()
      },
    )

    it('should throw ValidationException when validation fails', async () => {
      const value = { type: QuestionType.MultiChoice, foo: 'bar' }
      const instance = { __type: 'multi' }
      const errors = [{ property: 'answer', constraints: { isString: 'no' } }]

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue(errors as any)

      await expect(pipe.transform(value, {} as any)).rejects.toBeInstanceOf(
        ValidationException,
      )

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        MultiChoiceQuestionCorrectAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })
  })
})
