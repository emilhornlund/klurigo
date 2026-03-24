import KeyvRedis from '@keyv/redis'
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis'
import { BullModule } from '@nestjs/bullmq'
import { CacheModule } from '@nestjs/cache-manager'
import { Logger, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { MongooseModule } from '@nestjs/mongoose'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { RedisModule } from '@nestjs-modules/ioredis'
import { SentryModule } from '@sentry/nestjs/setup'
import Joi from 'joi'
import Keyv from 'keyv'
import { MurLockModule } from 'murlock'

import { AuthenticationModule } from '../modules/authentication'
import { DiscoveryApiModule } from '../modules/discovery-api'
import { GameApiModule } from '../modules/game-api'
import { GameAuthenticationModule } from '../modules/game-authentication'
import { GameCleanupModule } from '../modules/game-cleanup/game-cleanup.module'
import { GameCoreModule } from '../modules/game-core'
import { GameEventModule } from '../modules/game-event/game-event.module'
import { GameResultModule } from '../modules/game-result'
import { GameTaskModule } from '../modules/game-task'
import { HealthModule } from '../modules/health'
import { MediaModule } from '../modules/media'
import { QuizApiModule } from '../modules/quiz-api'
import { QuizCoreModule } from '../modules/quiz-core'
import { QuizRatingApiModule } from '../modules/quiz-rating-api'
import { TokenModule } from '../modules/token'
import { UserModule } from '../modules/user'
import { UserProfileApiModule } from '../modules/user-profile-api'

import { EnvironmentVariables } from './config'
import { AppController } from './controllers'
import { AllExceptionsFilter } from './filters/all-exceptions.filter'
import { TimeoutInterceptor } from './interceptors'
import { ValidationPipe } from './pipes'

const isProdEnv = process.env.NODE_ENV === 'production'
const isTestEnv = process.env.NODE_ENV === 'test'

/**
 * Root application module.
 *
 * This module initializes all core modules and shared configurations, including
 * database connections, exception filters, and core modules such as GameModule and AuthModule.
 */
@Module({
  imports: [
    ...(isProdEnv ? [SentryModule.forRoot()] : []),
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        ENVIRONMENT: Joi.string()
          .valid('local', 'beta', 'prod', 'test')
          .required(),
        SERVER_PORT: Joi.number().port().default(8080),
        SERVER_ALLOW_ORIGIN: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().port().required(),
        REDIS_PASSWORD: Joi.string().optional(),
        REDIS_DB: Joi.number().default(0),
        MONGODB_HOST: Joi.string().required(),
        MONGODB_PORT: Joi.number().port().required(),
        MONGODB_USERNAME: Joi.string().optional(),
        MONGODB_PASSWORD: Joi.string().optional(),
        MONGODB_DB: Joi.string().required(),
        JWT_SECRET: Joi.string(),
        JWT_PRIVATE_KEY_PATH: Joi.string(),
        JWT_PUBLIC_KEY_PATH: Joi.string(),
        PEXELS_API_KEY: Joi.string().required(),
        UPLOAD_DIRECTORY: Joi.string().required(),
        EMAIL_ENABLED: Joi.boolean().default(true),
        EMAIL_USERNAME: Joi.string().optional(),
        EMAIL_PASSWORD: Joi.string().optional(),
        KLURIGO_URL: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_REDIRECT_URI: Joi.string().required(),
        DISCOVERY_SEED_ON_INIT: Joi.boolean().optional().default(false),
      }),
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService<EnvironmentVariables>) => ({
        type: 'single',
        url: `redis://${config.get('REDIS_HOST')}:${config.get('REDIS_PORT')}`,
        options: {
          password: config.get('REDIS_PASSWORD'),
          db: Number(config.get('REDIS_DB')),
        },
      }),
      inject: [ConfigService],
    }),
    MurLockModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService<EnvironmentVariables>) => ({
        redisOptions: {
          url: `redis://${config.get('REDIS_HOST')}:${config.get('REDIS_PORT')}`,
          password: config.get('REDIS_PASSWORD'),
          database: Number(config.get('REDIS_DB')),
        },
        wait: 1000,
        maxAttempts: 3,
        logLevel: 'log',
        lockKeyPrefix: 'custom',
        ignoreUnlockFail: false,
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService<EnvironmentVariables>) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD'),
          db: Number(config.get('REDIS_DB')),
        },
        defaultJobOptions: {
          removeOnComplete: { count: 0 },
          removeOnFail: { count: 50 },
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService<EnvironmentVariables>) => {
        const username = config.get('MONGODB_USERNAME')
        const password = config.get('MONGODB_PASSWORD')
        if (username && password) {
          return {
            uri: `mongodb://${username}:${password}@${config.get('MONGODB_HOST')}:${config.get('MONGODB_PORT')}/${config.get('MONGODB_DB')}`,
          }
        }
        return {
          uri: `mongodb://${config.get('MONGODB_HOST')}:${config.get('MONGODB_PORT')}/${config.get('MONGODB_DB')}`,
        }
      },
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService<EnvironmentVariables>) => ({
        stores: [
          new Keyv(
            new KeyvRedis({
              url: `redis://${config.get<string>('REDIS_HOST')}:${config.get<number>('REDIS_PORT')}`,
              password: config.get<string>('REDIS_PASSWORD'),
              database: config.get<number>('REDIS_DB'),
            }),
          ),
        ],
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ...(isTestEnv
      ? []
      : [
          ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService<EnvironmentVariables>) => ({
              throttlers: [
                {
                  name: 'short',
                  ttl: 1000,
                  limit: 10,
                },
                {
                  name: 'medium',
                  ttl: 10000,
                  limit: 20,
                },
                {
                  name: 'long',
                  ttl: 60000,
                  limit: 100,
                },
              ],
              storage: new ThrottlerStorageRedisService({
                host: config.get('REDIS_HOST'),
                port: config.get('REDIS_PORT'),
                password: config.get('REDIS_PASSWORD'),
                db: Number(config.get('REDIS_DB')),
              }),
            }),
          }),
        ]),
    AuthenticationModule,
    DiscoveryApiModule,
    GameApiModule,
    GameAuthenticationModule,
    GameCleanupModule,
    GameCoreModule,
    GameEventModule,
    GameResultModule,
    GameTaskModule,
    HealthModule,
    MediaModule,
    QuizApiModule,
    QuizCoreModule,
    QuizRatingApiModule,
    TokenModule,
    UserProfileApiModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    Logger,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    ...(isTestEnv
      ? []
      : [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]),
  ],
})
export class AppModule {}
