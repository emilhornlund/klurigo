import { AuthProvider } from '@klurigo/common'
import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { MongooseModule } from '@nestjs/mongoose'

import { EmailModule } from '../email'
import { TokenModule } from '../token'

import {
  UserAuthController,
  UserController,
  UserProfileController,
} from './controllers'
import { GameEventListener } from './listeners/game-event.listener'
import {
  GoogleUserSchema,
  LocalUserSchema,
  NoneUserSchema,
  User,
  UserRepository,
  UserSchema,
} from './repositories'
import { UserEventHandler, UserService } from './services'

/**
 * Module for managing user-related operations.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
        discriminators: [
          { name: AuthProvider.None, schema: NoneUserSchema },
          { name: AuthProvider.Local, schema: LocalUserSchema },
          { name: AuthProvider.Google, schema: GoogleUserSchema },
        ],
      },
    ]),
    EventEmitterModule,
    EmailModule,
    TokenModule,
  ],
  controllers: [UserController, UserProfileController, UserAuthController],
  providers: [UserService, UserRepository, UserEventHandler, GameEventListener],
  exports: [UserService, UserRepository],
})
export class UserModule {}
