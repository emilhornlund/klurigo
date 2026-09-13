import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { ValidationException } from '../exceptions'
import { SKIP_VALIDATION_KEY } from '../utils'

/**
 * A global NestJS validation pipe that:
 * - Converts plain objects into typed class instances.
 * - Performs `class-validator` validation on them.
 * - Throws a `BadRequestException` if the incoming payload is missing or not an object.
 * - Throws a `ValidationException` if any constraint violations are found.
 * - Automatically skips validation for:
 *   1. Missing `metatype`.
 *   2. Primitive types (String, Boolean, Number, Array, Object).
 *   3. Classes decorated with `@SkipValidation()`.
 */
@Injectable()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ValidationPipe implements PipeTransform<any> {
  /**
   * Creates a new instance of the ValidationPipe.
   *
   * @param reflector - Used to retrieve metadata (e.g. `SKIP_VALIDATION_KEY`)
   *                    in order to determine if validation should be skipped
   *                    for a particular class.
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Transforms and validates the given value according to the provided metadata.
   *
   * Steps:
   * 1. If no `metatype` is provided, or it’s a primitive, or skip metadata is set,
   *    the value is returned unchanged.
   * 2. Otherwise, the value is converted to an instance of `metatype` using
   *    `plainToInstance()`.
   * 3. If the resulting object is not a plain object, throws `BadRequestException`.
   * 4. Runs `class-validator`’s `validate()` with strict property validation.
   *    If any errors are found, throws a `ValidationException` containing the
   *    error details.
   *
   * @param value      The original value to transform (e.g., request body).
   * @param metadata   The argument metadata, containing the `metatype`.
   * @returns The original value if validation is skipped or passes successfully.
   * @throws {BadRequestException}   If the payload is missing or not an object.
   * @throws {ValidationException}   If one or more validation constraints fail.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (
      !metatype ||
      this.isPrimitive(metatype) ||
      this.shouldSkipValidation(metatype)
    ) {
      return value
    }

    const object = plainToInstance(metatype, value)
    if (!object || typeof object !== 'object') {
      throw new BadRequestException('Missing request payload')
    }

    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
    if (errors.length > 0) {
      throw new ValidationException(errors)
    }
    return value
  }

  /**
   * Determines whether the given `metatype` is considered a primitive type
   * that should bypass validation.
   *
   * Recognized primitive types are: String, Boolean, Number, Array, and Object.
   *
   * @param metatype  The constructor function to check.
   * @returns `true` if `metatype` is one of the primitive types; `false` otherwise.
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private isPrimitive(metatype: Function): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const types: Function[] = [String, Boolean, Number, Array, Object]
    return types.includes(metatype)
  }

  /**
   * Checks whether the `@SkipValidation()` decorator was applied to the given class.
   *
   * @param metatype  The constructor function to check.
   * @returns `true` if the `SKIP_VALIDATION_KEY` metadata is present on `metatype`;
   *          `false` otherwise.
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private shouldSkipValidation(metatype: Function): boolean {
    return this.reflector.get<boolean>(SKIP_VALIDATION_KEY, metatype)
  }
}
