import { createRequire } from 'node:module'

import { DocumentBuilder } from '@nestjs/swagger'

const packageRequire = createRequire(__filename)
const { version: serviceVersion } = packageRequire('../../../package.json') as {
  version: string
}

/** Builds the public API contract metadata used by SwaggerModule. */
export function createOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('Klurigo API')
    .setDescription(
      'The Klurigo HTTP API for authentication, quizzes, games, media, profiles, and service health.',
    )
    .setVersion(serviceVersion)
    .addTag('auth', 'Authenticate users and game participants.')
    .addTag('discovery', 'Retrieve curated quiz discovery rails.')
    .addTag('game', 'Create games and manage live game sessions.')
    .addTag('health', 'Inspect service liveness, readiness, and dependencies.')
    .addTag('media', 'Upload and retrieve media assets.')
    .addTag('profile', 'Manage resources associated with the current user.')
    .addTag('quiz', 'Create, browse, and manage quiz content.')
    .addTag('user', 'Create users and manage user resources.')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token supplied in the Authorization header.',
      },
      'bearer',
    )
    .build()
}
