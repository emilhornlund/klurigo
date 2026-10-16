import { TokenDto } from '@klurigo/common'
import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
  MessageEvent,
} from '@nestjs/common'
import { Observable } from 'rxjs'

import { AuthGuardRequest } from '../../../app/shared/auth'
import { PlayerNotFoundException } from '../../game-core/exceptions'
import { GameEventSubscriber } from '../../game-event/services'
import { User } from '../../user/repositories'

type EventStreamRequest = AuthGuardRequest<TokenDto, User> & {
  params: { gameID: string }
  query: { connectionId?: string }
  gameEventStream?: Observable<MessageEvent>
}

@Injectable()
export class GameEventStreamGuard implements CanActivate {
  constructor(private readonly gameEventSubscriber: GameEventSubscriber) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<EventStreamRequest>()
    try {
      request.gameEventStream = await this.gameEventSubscriber.subscribe(
        request.params.gameID,
        request.payload.sub,
        request.query.connectionId,
      )
      return true
    } catch (error) {
      if (error instanceof PlayerNotFoundException) {
        throw new ConflictException('Player session is no longer available')
      }
      throw error
    }
  }
}
