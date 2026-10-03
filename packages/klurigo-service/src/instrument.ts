import * as Sentry from '@sentry/nestjs'

function getSentryEnvironment() {
  switch (process.env.KLURIGO_URL) {
    case 'https://beta.klurigo.com':
      return 'beta'
    case 'https://klurigo.com':
      return 'prod'
    default:
      return 'dev'
  }
}

if (process.env.NODE_ENV === 'production') {
  console.log('Initializing Sentry')
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.SENTRY_RELEASE,
    environment: getSentryEnvironment(),
    dataCollection: {
      userInfo: true,
      cookies: true,
      httpHeaders: true,
      urlQueryParams: true,
    },
    integrations: [
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
      Sentry.httpIntegration(),
    ],
    tracesSampleRate: 1.0,
  })
}
