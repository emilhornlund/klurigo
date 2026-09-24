import './instrument'

import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { SwaggerModule } from '@nestjs/swagger'

import { AppModule } from './app'
import { EnvironmentVariables } from './app/config'
import { createOpenApiConfig } from './app/swagger'
import { configureApp } from './app/utils'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    ...(process.env.NODE_ENV === 'production'
      ? { logger: ['fatal', 'error', 'warn', 'log'] }
      : {}),
  })
  configureApp(app)

  const document = SwaggerModule.createDocument(app, createOpenApiConfig())
  SwaggerModule.setup('api_docs', app, document)

  const configService = app.get(ConfigService<EnvironmentVariables>)
  const port = configService.get('SERVER_PORT')
  await app.listen(port, '0.0.0.0')
}
bootstrap()
