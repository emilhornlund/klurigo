import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import type * as jwt from 'jsonwebtoken'
import { MurLockModule } from 'murlock'

import { EnvironmentVariables } from '../../app/config'

import { TokenRepository } from './repositories'
import { Token, TokenSchema } from './repositories/models/schemas'
import { TokenCleanupSchedulerService, TokenService } from './services'

/**
 * Token domain module.
 *
 * Provides:
 * - JWT configuration (issuer, audience, algorithm, and secret).
 * - Token persistence (TokenRepository + Mongo schema).
 * - TokenService for signing, verifying, and revoking tokens.
 * - Scheduled cleanup of expired tokens (TokenCleanupSchedulerService).
 *
 * Exported:
 * - TokenService (for other modules such as Authentication and User).
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule, MurLockModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService<EnvironmentVariables>,
      ) => {
        const jwtSecret = configService.get<string>('JWT_SECRET')

        const COMMON_JWT_OPTIONS: jwt.VerifyOptions & jwt.SignOptions = {
          algorithm: 'HS256',
          issuer: 'quiz',
          audience: `${configService.get<string>('ENVIRONMENT')}-quiz`,
        }

        return {
          global: true,
          secret: jwtSecret,
          signOptions: COMMON_JWT_OPTIONS,
          verifyOptions: COMMON_JWT_OPTIONS,
        }
      },
    }),
    MongooseModule.forFeature([
      {
        name: Token.name,
        schema: TokenSchema,
      },
    ]),
  ],
  providers: [TokenCleanupSchedulerService, TokenRepository, TokenService],
  exports: [TokenService],
})
export class TokenModule {}
