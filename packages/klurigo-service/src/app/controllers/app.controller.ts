import { Controller, Get } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'

import { Public } from '../../modules/authentication/controllers/decorators'
import { ApiInternalServerErrorResponse } from '../decorators'

@Controller()
export class AppController {
  @Public()
  @Get('/debug-sentry')
  @ApiExcludeEndpoint()
  @ApiInternalServerErrorResponse()
  getError() {
    throw new Error('My first Sentry error from klurigo-service!')
  }
}
