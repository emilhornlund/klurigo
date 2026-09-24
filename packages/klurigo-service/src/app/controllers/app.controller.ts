import { Controller, Get } from '@nestjs/common'

import { Public } from '../../modules/authentication/controllers/decorators'
import { ApiInternalServerErrorResponse } from '../decorators'

@Controller()
export class AppController {
  @Public()
  @Get('/debug-sentry')
  @ApiInternalServerErrorResponse()
  getError() {
    throw new Error('My first Sentry error from klurigo-service!')
  }
}
