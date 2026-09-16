import * as fs from 'fs'
import { rm, unlink } from 'node:fs/promises'
import { basename, join, resolve, sep } from 'path'

import {
  TokenDto,
  UPLOAD_IMAGE_MAX_FILE_SIZE,
  UPLOAD_IMAGE_MIMETYPE_REGEX,
  UPLOAD_IMAGE_MIN_FILE_SIZE,
} from '@klurigo/common'
import {
  Inject,
  Injectable,
  Logger,
  PipeTransform,
  Scope,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { REQUEST } from '@nestjs/core'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

import { EnvironmentVariables } from '../../../app/config'
import type { AuthGuardRequest } from '../../../app/shared/auth'
import { User } from '../../user/repositories'

/**
 * Pipe that validates, processes, and converts uploaded image files.
 *
 * It resizes the image based on orientation and converts it to WebP format.
 * The original file is removed after processing.
 */
@Injectable({ scope: Scope.REQUEST })
export class ParseImageFilePipe implements PipeTransform<
  Express.Multer.File,
  Promise<string>
> {
  /**
   * Creates a new instance of ParseImageFilePipe.
   *
   * @param request - description here.
   * @param configService - Service to access environment variables.
   * @param logger - Optional logger for error tracking.
   */
  constructor(
    @Inject(REQUEST) private readonly request: AuthGuardRequest<TokenDto, User>,
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly logger: Logger = new Logger(ParseImageFilePipe.name),
  ) {}

  /**
   * Transforms and processes the uploaded file.
   *
   * @param file - The uploaded file to validate and convert.
   *
   * @returns The filename of the newly processed image.
   */
  async transform(file: Express.Multer.File): Promise<string> {
    if (!file || typeof file.filename !== 'string' || !file.filename) {
      throw new UnprocessableEntityException('Unable to process image file')
    }

    const configuredDir = this.configService.get<string>('UPLOAD_DIRECTORY')!
    const baseDir = resolve(configuredDir)
    const safeFilename = basename(file.filename)

    const originalFilePath = resolve(baseDir, safeFilename)
    if (!originalFilePath.startsWith(baseDir + sep)) {
      throw new UnprocessableEntityException('Unable to process image file')
    }

    if (!this.request.user) {
      throw new UnauthorizedException('Unauthorized')
    }

    const { _id: userId } = this.request.user

    let isNewDirectory = false
    const newOutputDirectory = join(baseDir, userId)
    if (!fs.existsSync(newOutputDirectory)) {
      fs.mkdirSync(newOutputDirectory)
      isNewDirectory = true
    }

    const newFileName = `${userId}/${uuidv4()}.webp`
    const newFilePath = join(baseDir, newFileName)

    try {
      this.validate(file)
      await this.resizeImage(originalFilePath, newFilePath)
    } catch (error) {
      if (isNewDirectory) {
        try {
          await rm(newOutputDirectory, { recursive: true, force: true })
        } catch (cleanupError) {
          const { message, stack } = cleanupError as Error
          this.logger.warn(
            `Unable to clean up image output directory: ${message}`,
            stack,
          )
        }
      }
      const { message, stack } = error as Error
      this.logger.log(`Unable to process image file: ${message}`, stack)
      throw new UnprocessableEntityException('Unable to process image file')
    } finally {
      const toDelete = resolve(baseDir, safeFilename)
      if (toDelete.startsWith(baseDir + sep)) {
        try {
          await unlink(toDelete)
        } catch (cleanupError) {
          const { message, stack } = cleanupError as Error
          this.logger.warn(
            `Unable to clean up uploaded image file: ${message}`,
            stack,
          )
        }
      }
    }

    return newFileName
  }

  /**
   * Validates the uploaded file's mimetype and size.
   *
   * @param file - The file to validate.
   *
   * @private
   */
  private validate(file: Express.Multer.File): void {
    if (
      typeof file?.mimetype !== 'string' ||
      !file.mimetype.match(UPLOAD_IMAGE_MIMETYPE_REGEX)
    ) {
      this.logger.warn(`Invalid file type: ${file.mimetype}`)
      throw new UnprocessableEntityException('Unable to process image file')
    }

    if (
      typeof file?.size !== 'number' ||
      !Number.isFinite(file.size) ||
      file.size < UPLOAD_IMAGE_MIN_FILE_SIZE ||
      file.size > UPLOAD_IMAGE_MAX_FILE_SIZE
    ) {
      this.logger.warn(`Invalid file size: ${file.size}`)
      throw new UnprocessableEntityException('Unable to process image file')
    }
  }

  /**
   * Resizes the image and converts it to WebP format.
   *
   * @param inputFilePath - Path to the uploaded image.
   * @param outputFilePath - Path to save the processed image.
   *
   * @private
   */
  private async resizeImage(
    inputFilePath: string,
    outputFilePath: string,
  ): Promise<void> {
    const image = sharp(inputFilePath)

    await image.metadata()

    await image
      .resize({
        width: 800,
        height: 800,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toFile(outputFilePath)
  }
}
