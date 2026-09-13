import { ArgumentMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Type } from 'class-transformer'
import { IsString, validate, ValidateNested } from 'class-validator'

import { User } from '../../modules/user/repositories'
import { ValidationException } from '../exceptions'

import { ValidationPipe } from './validation.pipe'

jest.mock('class-validator', () => ({
  ...jest.requireActual('class-validator'),
  validate: jest.fn(),
}))

class TestDto {
  @IsString()
  property: string
}

class NestedDto {
  @IsString()
  property: string
}

class NestedTestDto {
  @ValidateNested()
  @Type(() => NestedDto)
  nested: NestedDto
}

describe('ValidationPipe', () => {
  let reflector: Reflector
  let pipe: ValidationPipe

  beforeEach(() => {
    reflector = new Reflector()
    pipe = new ValidationPipe(reflector)
    ;(validate as jest.Mock).mockReset()
  })

  it('should return the value if no metatype is provided', async () => {
    const value = { property: 'value' }
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: undefined,
      data: '',
    }

    const result = await pipe.transform(value, metadata)

    expect(result).toBe(value)
    expect(validate).not.toHaveBeenCalled()
  })

  it('should return the value if metatype is a primitive type', async () => {
    const value = { property: 'value' }
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: String,
      data: '',
    }

    const result = await pipe.transform(value, metadata)

    expect(result).toBe(value)
  })

  it('should return the value if validation should be skipped', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(true)

    const value = { property: 'value' }
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: User,
      data: '',
    }

    const result = await pipe.transform(value, metadata)

    expect(result).toBe(value)
    expect(validate).not.toHaveBeenCalled()
  })

  it('should throw ValidationException if validation fails', async () => {
    const value = { property: 'value' }
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    }
    const validationErrors = [
      {
        property: 'property',
        constraints: { isString: 'property must be a string' },
      },
    ]
    ;(validate as jest.Mock).mockResolvedValue(validationErrors)

    await expect(pipe.transform(value, metadata)).rejects.toThrow(
      ValidationException,
    )

    try {
      await pipe.transform(value, metadata)
    } catch (e) {
      const exception = e as ValidationException
      expect(exception).toBeInstanceOf(ValidationException)
      expect(exception.validationErrors).toEqual(validationErrors)
    }
  })

  it('should return the value if validation succeeds', async () => {
    const value = { property: 'value' }
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    }
    ;(validate as jest.Mock).mockResolvedValue([])

    const result = await pipe.transform(value, metadata)

    expect(result).toBe(value)
    expect(validate).toHaveBeenCalledWith(expect.any(TestDto), {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  })

  it('should reject an undeclared top-level property', async () => {
    const value = { property: 'value', undeclared: 'value' }
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: TestDto,
      data: '',
    }
    const actualValidate =
      jest.requireActual<typeof import('class-validator')>(
        'class-validator',
      ).validate
    ;(validate as jest.Mock).mockImplementation(actualValidate)

    const result = pipe.transform(value, metadata)

    await expect(result).rejects.toThrow(ValidationException)
    await expect(result).rejects.toMatchObject({
      validationErrors: expect.arrayContaining([
        expect.objectContaining({
          property: 'undeclared',
          constraints: expect.objectContaining({
            whitelistValidation: expect.any(String),
          }),
        }),
      ]),
    })
  })

  it('should reject an undeclared nested property', async () => {
    const value = {
      nested: { property: 'value', undeclared: 'value' },
    }
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: NestedTestDto,
      data: '',
    }
    const actualValidate =
      jest.requireActual<typeof import('class-validator')>(
        'class-validator',
      ).validate
    ;(validate as jest.Mock).mockImplementation(actualValidate)

    const result = pipe.transform(value, metadata)

    await expect(result).rejects.toThrow(ValidationException)
    await expect(result).rejects.toMatchObject({
      validationErrors: [
        expect.objectContaining({
          property: 'nested',
          children: expect.arrayContaining([
            expect.objectContaining({
              property: 'undeclared',
              constraints: expect.objectContaining({
                whitelistValidation: expect.any(String),
              }),
            }),
          ]),
        }),
      ],
    })
  })
})
