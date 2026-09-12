import { GAME_PIN_REGEX } from '@klurigo/common'
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common'

@Injectable()
export class ParseGamePINPipe implements PipeTransform<string, string> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: string, metadata: ArgumentMetadata): string {
    if (typeof value !== 'string' || !GAME_PIN_REGEX.test(value)) {
      throw new BadRequestException('Validation failed')
    }
    return value
  }
}
