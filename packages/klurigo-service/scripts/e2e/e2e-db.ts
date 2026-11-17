import { Redis } from 'ioredis'
import mongoose from 'mongoose'

type ResetOptions = {
  shouldWipeMongo: boolean
  shouldWipeRedis: boolean
  seed?: (ctx: { mongo: typeof mongoose; redis: Redis }) => Promise<void>
}

export function getMongoUri(): string {
  const host = process.env.MONGODB_HOST ?? 'localhost'
  const port = process.env.MONGODB_PORT ?? '27017'
  const database = process.env.MONGODB_DB ?? 'klurigo_service_test'
  return process.env.MONGODB_URI ?? `mongodb://${host}:${port}/${database}`
}

function assertSafeMongoUri(mongoUri: string): void {
  const dbName = mongoUri.split('/').pop()?.split('?')[0]
  if (!dbName || !dbName.includes('_test')) {
    throw new Error(
      `Refusing to wipe MongoDB database "${dbName}". Set MONGODB_URI to a test database (e.g. .../klurigo_service_test).`,
    )
  }
}

export function getRedisUrl(): string {
  const redisDb = process.env.REDIS_DB ?? '1'
  const host = process.env.REDIS_HOST ?? 'localhost'
  const port = process.env.REDIS_PORT ?? '6379'
  const base = process.env.REDIS_URL ?? `redis://${host}:${port}`
  return `${base}/${redisDb}`
}

export async function resetE2eDb(options: ResetOptions): Promise<void> {
  const mongoUri = getMongoUri()
  assertSafeMongoUri(mongoUri)

  const redis = new Redis(getRedisUrl())

  try {
    await mongoose.connect(mongoUri)

    if (options.shouldWipeMongo) {
      const db = mongoose.connection.db
      if (!db) {
        console.error(`Unable to connect to mongodb '${mongoUri}'`)
        throw new Error(`Unable to connect to mongodb '${mongoUri}'`)
      }
      const collections = await db.collections()
      await Promise.all(collections.map((c) => c.deleteMany({})))
    }

    if (options.shouldWipeRedis) {
      await redis.flushdb()
    }

    if (options.seed) {
      await options.seed({ mongo: mongoose, redis })
    }
  } finally {
    await mongoose.disconnect().catch(() => undefined)
    await redis.quit().catch(() => undefined)
  }
}
