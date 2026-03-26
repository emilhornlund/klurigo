import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { UserQuizzesPageFilter } from './user-quizzes-page.filter'

type ValidationResult = {
  instance: UserQuizzesPageFilter
  errors: string[]
}

const validateFilter = async (
  input: Record<string, unknown>,
): Promise<ValidationResult> => {
  const instance = plainToInstance(UserQuizzesPageFilter, input)
  const validationErrors = await validate(instance)

  const errors = validationErrors.flatMap((error) =>
    error.constraints ? Object.values(error.constraints) : [],
  )

  return { instance, errors }
}

describe(UserQuizzesPageFilter.name, () => {
  describe('happy paths', () => {
    it('accepts an empty object (all fields optional)', async () => {
      const { instance, errors } = await validateFilter({})

      expect(errors).toEqual([])
      expect(instance.sort).toBeUndefined()
      expect(instance.order).toBeUndefined()
      expect(instance.limit).toBeUndefined()
      expect(instance.offset).toBeUndefined()
    })

    it('accepts valid values for sort and order', async () => {
      const { errors } = await validateFilter({
        sort: 'updated',
        order: 'desc',
      })

      expect(errors).toEqual([])
    })

    it('accepts limit within [5, 50] and offset >= 0', async () => {
      const { errors } = await validateFilter({
        limit: 5,
        offset: 0,
      })

      expect(errors).toEqual([])
    })
  })

  describe('class-transformer conversions', () => {
    it('transforms limit and offset from numeric strings into numbers', async () => {
      const { instance, errors } = await validateFilter({
        limit: '10',
        offset: '3',
      })

      expect(errors).toEqual([])
      expect(instance.limit).toBe(10)
      expect(instance.offset).toBe(3)
      expect(typeof instance.limit).toBe('number')
      expect(typeof instance.offset).toBe('number')
    })
  })

  describe('validation failures: sort', () => {
    it('rejects invalid sort values with the custom message', async () => {
      const { errors } = await validateFilter({ sort: 'name' })

      expect(errors).toContain(
        'sort must be one of the following values: title, created, updated',
      )
    })
  })

  describe('validation failures: order', () => {
    it('rejects invalid order values with the custom message', async () => {
      const { errors } = await validateFilter({ order: 'up' })

      expect(errors).toContain(
        'order must be one of the following values: asc, desc',
      )
    })
  })

  describe('validation failures: limit', () => {
    it('rejects limit < 5', async () => {
      const { errors } = await validateFilter({ limit: 4 })

      expect(errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('limit must not be less than 5'),
        ]),
      )
    })

    it('rejects limit > 50', async () => {
      const { errors } = await validateFilter({ limit: 51 })

      expect(errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('limit must not be greater than 50'),
        ]),
      )
    })
  })

  describe('validation failures: offset', () => {
    it('rejects offset < 0', async () => {
      const { errors } = await validateFilter({ offset: -1 })

      expect(errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('offset must not be less than 0'),
        ]),
      )
    })
  })
})
