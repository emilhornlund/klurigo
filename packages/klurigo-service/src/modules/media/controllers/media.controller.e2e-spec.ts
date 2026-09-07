import { copyFile, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'path'

import { INestApplication } from '@nestjs/common'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'

import {
  closeTestApp,
  createDefaultUserAndAuthenticate,
  createTestApp,
  resetTestState,
} from '../../../../test-utils/utils'

describe('MediaController (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    app = await createTestApp()
  })

  afterEach(async () => {
    try {
      await resetTestState(app)
    } finally {
      await closeTestApp(app)
    }
  })

  describe('/api/media/photos (GET)', () => {
    it('should succeed in retrieving photos', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .get('/api/media/photos?search=nature&limit=10&offset=0')
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            photos: [
              {
                photoURL:
                  'https://images.pexels.com/photos/247599/pexels-photo-247599.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
                thumbnailURL:
                  'https://images.pexels.com/photos/247599/pexels-photo-247599.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=200&w=280',
                alt: 'Lush green terraced rice fields with a rustic hut under soft sunlight.',
              },
            ],
            total: 1,
            limit: 10,
            offset: 0,
          })
        })
    })

    it('should return a 401 error when the request is unauthorized', async () => {
      return supertest(app.getHttpServer())
        .get('/api/media/photos')
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })
  })

  describe('/api/media/uploads/photos (POST)', () => {
    test.each([['gif'], ['jpeg'], ['jpg'], ['png'], ['tiff'], ['webp']])(
      'should succeed in uploading a %s image',
      async (extension) => {
        const { accessToken } = await createDefaultUserAndAuthenticate(app)

        await supertest(app.getHttpServer())
          .post('/api/media/uploads/photos')
          .set({ Authorization: `Bearer ${accessToken}` })
          .attach(
            'file',
            join(__dirname, `../../../../test-utils/assets/photo.${extension}`),
          )
          .expect(201)
          .expect((res) => {
            expect(res.body).toEqual({
              filename: expect.stringMatching(/^.*\/.*\.webp$/),
            })
            return rm(
              join(
                __dirname,
                '../../../../',
                process.env.UPLOAD_DIRECTORY || '',
                `/${dirname(res.body.filename)}`,
              ),
              { recursive: true, force: true },
            )
          })
      },
    )

    it('should fail in uploading a non image file', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      return supertest(app.getHttpServer())
        .post('/api/media/uploads/photos')
        .set({ Authorization: `Bearer ${accessToken}` })
        .attach(
          'file',
          join(__dirname, '../../../../test-utils/assets/empty.txt'),
        )
        .expect(422)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Unable to process image file',
            status: 422,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return a 401 error when the request is unauthorized', async () => {
      return supertest(app.getHttpServer())
        .post('/api/media/uploads/photos')
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })
  })

  describe('/api/media/uploads/photos/:photoId (DELETE)', () => {
    it('should succeed in deleting an uploaded photo', async () => {
      const {
        accessToken,
        user: { _id: userId },
      } = await createDefaultUserAndAuthenticate(app)

      const photoId = uuidv4()

      const srcFile = join(
        __dirname,
        `../../../../test-utils/assets/photo.webp`,
      )
      const dstFile = join(
        __dirname,
        '../../../../',
        process.env.UPLOAD_DIRECTORY || '',
        `/${userId}/${photoId}.webp`,
      )
      await mkdir(dirname(dstFile))
      await copyFile(srcFile, dstFile)

      return supertest(app.getHttpServer())
        .delete(`/api/media/uploads/photos/${photoId}`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(204)
        .expect((res) => {
          expect(res.body).toEqual({})
          return rm(dirname(dstFile), { recursive: true, force: true })
        })
    })

    it('should fail in deleting a non existing uploaded photo', async () => {
      const { accessToken } = await createDefaultUserAndAuthenticate(app)

      const photoId = uuidv4()

      return supertest(app.getHttpServer())
        .delete(`/api/media/uploads/photos/${photoId}`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .expect(404)
        .expect((res) => {
          expect(res.body).toEqual({
            message: `Uploaded photo was not found by ID '${photoId}'`,
            status: 404,
            timestamp: expect.anything(),
          })
        })
    })

    it('should return a 401 error when the request is unauthorized', async () => {
      const photoId = uuidv4()

      return supertest(app.getHttpServer())
        .delete(`/api/media/uploads/photos/${photoId}`)
        .expect(401)
        .expect((res) => {
          expect(res.body).toEqual({
            message: 'Missing Authorization header',
            status: 401,
            timestamp: expect.anything(),
          })
        })
    })
  })
})
