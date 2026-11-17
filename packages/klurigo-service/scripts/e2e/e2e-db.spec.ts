import { getMongoUri, getRedisUrl } from './e2e-db'

const connectionKeys = [
  'MONGODB_URI',
  'MONGODB_HOST',
  'MONGODB_PORT',
  'MONGODB_DB',
  'REDIS_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_DB',
] as const

const previousValues = Object.fromEntries(
  connectionKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof connectionKeys)[number], string | undefined>

beforeEach(() => {
  for (const key of connectionKeys) delete process.env[key]
})

afterEach(() => {
  for (const key of connectionKeys) {
    const previous = previousValues[key]
    if (previous === undefined) delete process.env[key]
    else process.env[key] = previous
  }
})

describe('e2e database connection targets', () => {
  it('preserves localhost defaults for local development', () => {
    expect(getMongoUri()).toBe('mongodb://localhost:27017/klurigo_service_test')
    expect(getRedisUrl()).toBe('redis://localhost:6379/1')
  })

  it('uses orchestrator-provided test service hostnames and ports', () => {
    process.env.MONGODB_HOST = 'klurigo-test-mongodb'
    process.env.MONGODB_PORT = '27018'
    process.env.MONGODB_DB = 'isolated_test'
    process.env.REDIS_HOST = 'klurigo-test-redis'
    process.env.REDIS_PORT = '6380'
    process.env.REDIS_DB = '2'

    expect(getMongoUri()).toBe(
      'mongodb://klurigo-test-mongodb:27018/isolated_test',
    )
    expect(getRedisUrl()).toBe('redis://klurigo-test-redis:6380/2')
  })

  it('honors explicit connection URLs over host and port settings', () => {
    process.env.MONGODB_HOST = 'ignored-mongodb'
    process.env.REDIS_HOST = 'ignored-redis'
    process.env.MONGODB_URI = 'mongodb://explicit-host:27019/explicit_test'
    process.env.REDIS_URL = 'redis://explicit-host:6381'

    expect(getMongoUri()).toBe('mongodb://explicit-host:27019/explicit_test')
    expect(getRedisUrl()).toBe('redis://explicit-host:6381/1')
  })
})
