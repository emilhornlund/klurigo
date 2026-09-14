import { environmentValidationSchema } from './environment.validation'

const validEnvironment = {
  ENVIRONMENT: 'test',
  SERVER_ALLOW_ORIGIN: 'http://localhost:3000',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  MONGODB_HOST: 'localhost',
  MONGODB_PORT: 27017,
  MONGODB_DB: 'klurigo_service_test',
  JWT_SECRET: 'super_secret',
  PEXELS_API_KEY: 'test-key',
  UPLOAD_DIRECTORY: './public/uploads',
  KLURIGO_URL: 'http://test',
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost/callback',
}

describe('environment validation', () => {
  it('accepts a valid JWT signing secret', () => {
    const { error } = environmentValidationSchema.validate(validEnvironment)

    expect(error).toBeUndefined()
  })

  it('rejects a missing JWT signing secret', () => {
    const environmentWithoutSecret = {
      ...validEnvironment,
      JWT_SECRET: undefined,
    }
    const { error } = environmentValidationSchema.validate(
      environmentWithoutSecret,
    )

    expect(error?.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['JWT_SECRET'],
          type: 'any.required',
        }),
      ]),
    )
  })

  it('rejects an empty JWT signing secret', () => {
    const { error } = environmentValidationSchema.validate({
      ...validEnvironment,
      JWT_SECRET: '',
    })

    expect(error?.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['JWT_SECRET'],
        }),
      ]),
    )
  })
})
