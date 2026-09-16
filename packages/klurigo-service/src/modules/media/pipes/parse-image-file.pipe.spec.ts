import { mkdir, mkdtemp, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  TokenDto,
  UPLOAD_IMAGE_MAX_FILE_SIZE,
  UPLOAD_IMAGE_MIN_FILE_SIZE,
} from '@klurigo/common'
import {
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import sharp from 'sharp'

import { buildMockPrimaryUser } from '../../../../test-utils/data'
import { EnvironmentVariables } from '../../../app/config'
import type { AuthGuardRequest } from '../../../app/shared/auth'
import { User } from '../../user/repositories'

import { ParseImageFilePipe } from './parse-image-file.pipe'

jest.mock('node:fs/promises', () => {
  const actual =
    jest.requireActual<typeof import('node:fs/promises')>('node:fs/promises')
  return {
    ...actual,
    rm: jest.fn(actual.rm),
    unlink: jest.fn(actual.unlink),
  }
})

type ImageFileFixture = Pick<
  Express.Multer.File,
  'filename' | 'mimetype' | 'size'
>

describe(ParseImageFilePipe.name, () => {
  let uploadDirectory: string
  let pipe: ParseImageFilePipe
  let logger: { log: jest.Mock; warn: jest.Mock }

  beforeEach(async () => {
    uploadDirectory = await mkdtemp(join(tmpdir(), 'klurigo-image-pipe-'))
    logger = { log: jest.fn(), warn: jest.fn() }

    pipe = new ParseImageFilePipe(
      { user: buildMockPrimaryUser() } as unknown as AuthGuardRequest<
        TokenDto,
        User
      >,
      {
        get: jest.fn().mockReturnValue(uploadDirectory),
      } as unknown as ConfigService<EnvironmentVariables>,
      logger as any,
    )
  })

  afterEach(async () => {
    await rm(uploadDirectory, { recursive: true, force: true })
  })

  async function createUpload(
    filename: string,
    contents = Buffer.from('upload'),
  ): Promise<ImageFileFixture> {
    const filePath = join(uploadDirectory, filename)
    await writeFile(filePath, contents)
    return {
      filename,
      mimetype: 'image/png',
      size: (await stat(filePath)).size,
    }
  }

  it('rejects a missing upload with an unprocessable entity error', async () => {
    await expect(
      pipe.transform(undefined as unknown as Express.Multer.File),
    ).rejects.toBeInstanceOf(UnprocessableEntityException)
  })

  it.each([
    ['invalid MIME type', { mimetype: 'text/plain', size: 10 }],
    [
      'size below the minimum',
      { mimetype: 'image/png', size: UPLOAD_IMAGE_MIN_FILE_SIZE - 1 },
    ],
    [
      'size above the maximum',
      { mimetype: 'image/png', size: UPLOAD_IMAGE_MAX_FILE_SIZE + 1 },
    ],
    ['non-finite size', { mimetype: 'image/png', size: Number.NaN }],
  ])(
    'rejects an upload with %s and cleans up the source',
    async (_, details) => {
      const file = await createUpload('invalid-upload.png')
      const invalidFile = { ...file, ...details } as Express.Multer.File

      await expect(pipe.transform(invalidFile)).rejects.toThrow(
        'Unable to process image file',
      )
      await expect(stat(join(uploadDirectory, file.filename))).rejects.toThrow()
    },
  )

  it.each([UPLOAD_IMAGE_MIN_FILE_SIZE, UPLOAD_IMAGE_MAX_FILE_SIZE])(
    'accepts the exact file size boundary %s',
    async (size) => {
      const file = await createUpload('boundary-upload.png')
      const resizeSpy = jest
        .spyOn(pipe as any, 'resizeImage')
        .mockResolvedValue(undefined)

      const filename = await pipe.transform({
        ...file,
        size,
      } as Express.Multer.File)

      expect(filename).toMatch(
        new RegExp(`^${buildMockPrimaryUser()._id}/.*\\.webp$`),
      )
      expect(resizeSpy).toHaveBeenCalledTimes(1)
    },
  )

  it('resizes a large square image to the 800 pixel limit', async () => {
    const filePath = join(uploadDirectory, 'square.png')
    await sharp({
      create: {
        width: 1200,
        height: 1200,
        channels: 3,
        background: { r: 20, g: 40, b: 60 },
      },
    })
      .png()
      .toFile(filePath)
    const file = {
      filename: 'square.png',
      mimetype: 'image/png',
      size: (await stat(filePath)).size,
    } as Express.Multer.File

    const outputFilename = await pipe.transform(file)
    const outputMetadata = await sharp(
      join(uploadDirectory, outputFilename),
    ).metadata()

    expect(outputMetadata.width).toBe(800)
    expect(outputMetadata.height).toBe(800)
    await expect(stat(filePath)).rejects.toThrow()
  })

  it('normalizes resize errors and still removes the source file', async () => {
    const file = await createUpload('failed-upload.png')
    jest
      .spyOn(pipe as any, 'resizeImage')
      .mockRejectedValue(new Error('resize failed'))

    await expect(pipe.transform(file as Express.Multer.File)).rejects.toThrow(
      'Unable to process image file',
    )
    await expect(stat(join(uploadDirectory, file.filename))).rejects.toThrow()
  })

  it('does not let source cleanup errors mask a processing error', async () => {
    const sourceDirectory = join(uploadDirectory, 'directory-upload')
    await mkdir(sourceDirectory)
    jest
      .spyOn(pipe as any, 'resizeImage')
      .mockRejectedValue(new Error('resize failed'))

    await expect(
      pipe.transform({
        filename: 'directory-upload',
        mimetype: 'image/png',
        size: 1,
      } as Express.Multer.File),
    ).rejects.toThrow('Unable to process image file')
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unable to clean up uploaded image file'),
      expect.any(String),
    )
  })

  it('returns the processed filename when source cleanup fails', async () => {
    const file = await createUpload('successful-upload.png')
    jest.spyOn(pipe as any, 'resizeImage').mockResolvedValue(undefined)
    ;(unlink as jest.MockedFunction<typeof unlink>).mockRejectedValueOnce(
      new Error('source cleanup failed'),
    )

    await expect(pipe.transform(file as Express.Multer.File)).resolves.toMatch(
      new RegExp(`^${buildMockPrimaryUser()._id}/.*\\.webp$`),
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unable to clean up uploaded image file'),
      expect.any(String),
    )
  })

  it('does not let output directory cleanup errors mask a processing error', async () => {
    const file = await createUpload('failed-directory-cleanup.png')
    ;(rm as jest.MockedFunction<typeof rm>).mockRejectedValueOnce(
      new Error('directory cleanup failed'),
    )
    jest
      .spyOn(pipe as any, 'resizeImage')
      .mockRejectedValue(new Error('resize failed'))

    await expect(pipe.transform(file as Express.Multer.File)).rejects.toThrow(
      'Unable to process image file',
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unable to clean up image output directory'),
      expect.any(String),
    )
  })

  it('rejects an unauthorized request before creating an output directory', async () => {
    const file = await createUpload('unauthorized.png')
    pipe = new ParseImageFilePipe(
      {} as AuthGuardRequest<TokenDto, User>,
      {
        get: jest.fn().mockReturnValue(uploadDirectory),
      } as unknown as ConfigService<EnvironmentVariables>,
      logger as any,
    )

    await expect(
      pipe.transform(file as Express.Multer.File),
    ).rejects.toBeInstanceOf(UnauthorizedException)
    await expect(
      stat(join(uploadDirectory, file.filename)),
    ).resolves.toBeDefined()
  })
})
