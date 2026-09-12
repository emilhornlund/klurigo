import { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'

import { EnvironmentVariables } from '../config'

export function configureApp(app: INestApplication) {
  app.enableShutdownHooks()
  app.setGlobalPrefix('/api', { exclude: ['/health', '/health/*path'] })
  app.use(helmet())

  const configService = app.get(ConfigService<EnvironmentVariables>)
  const origin = configService.get<string>('SERVER_ALLOW_ORIGIN')
  app.enableCors({ origin, credentials: true })
}
