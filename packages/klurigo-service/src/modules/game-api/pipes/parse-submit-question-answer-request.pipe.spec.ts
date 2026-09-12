import { QuestionType } from '@klurigo/common'
import { BadRequestException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { ValidationException } from '../../../app/exceptions'
import {
  SubmitMultiChoiceQuestionAnswerRequest,
  SubmitPinQuestionAnswerRequest,
  SubmitPuzzleQuestionAnswerRequest,
  SubmitRangeQuestionAnswerRequest,
  SubmitTrueFalseQuestionAnswerRequest,
  SubmitTypeAnswerQuestionAnswerRequest,
} from '../controllers/models/requests'

import { ParseSubmitQuestionAnswerRequestPipe } from './parse-submit-question-answer-request.pipe'

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

describe('ParseSubmitQuestionAnswerRequestPipe', () => {
  let pipe: ParseSubmitQuestionAnswerRequestPipe

  const plainToInstanceMock = plainToInstance as jest.MockedFunction<
    typeof plainToInstance
  >
  const validateMock = validate as jest.MockedFunction<typeof validate>

  beforeEach(() => {
    pipe = new ParseSubmitQuestionAnswerRequestPipe()
    jest.resetAllMocks()
  })

  it('should be defined', () => {
    expect(pipe).toBeDefined()
  })

  describe('Valid requests', () => {
    it('should transform MultiChoice requests', async () => {
      const value = { type: QuestionType.MultiChoice, foo: 'bar' }
      const instance = { __type: 'multi' }

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue([])

      await expect(pipe.transform(value, {} as any)).resolves.toBe(instance)

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        SubmitMultiChoiceQuestionAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })

    it('should transform Range requests', async () => {
      const value = { type: QuestionType.Range, foo: 'bar' }
      const instance = { __type: 'range' }

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue([])

      await expect(pipe.transform(value, {} as any)).resolves.toBe(instance)

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        SubmitRangeQuestionAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })

    it('should transform TrueFalse requests', async () => {
      const value = { type: QuestionType.TrueFalse, foo: 'bar' }
      const instance = { __type: 'truefalse' }

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue([])

      await expect(pipe.transform(value, {} as any)).resolves.toBe(instance)

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        SubmitTrueFalseQuestionAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })

    it('should transform TypeAnswer requests', async () => {
      const value = { type: QuestionType.TypeAnswer, foo: 'bar' }
      const instance = { __type: 'typeanswer' }

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue([])

      await expect(pipe.transform(value, {} as any)).resolves.toBe(instance)

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        SubmitTypeAnswerQuestionAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })

    it('should transform Pin requests', async () => {
      const value = { type: QuestionType.Pin, foo: 'bar' }
      const instance = { __type: 'pin' }

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue([])

      await expect(pipe.transform(value, {} as any)).resolves.toBe(instance)

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        SubmitPinQuestionAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })

    it('should transform Puzzle requests', async () => {
      const value = { type: QuestionType.Puzzle, foo: 'bar' }
      const instance = { __type: 'puzzle' }

      plainToInstanceMock.mockReturnValue(instance as any)
      validateMock.mockResolvedValue([])

      await expect(pipe.transform(value, {} as any)).resolves.toBe(instance)

      expect(plainToInstanceMock).toHaveBeenCalledWith(
        SubmitPuzzleQuestionAnswerRequest,
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
        SubmitMultiChoiceQuestionAnswerRequest,
        value,
      )
      expect(validateMock).toHaveBeenCalledWith(instance)
    })
  })
})
