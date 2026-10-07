import * as Sentry from '@sentry/react'

import config from './config'

function getSentryEnvironment() {
  switch (config.baseUrl) {
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
    dsn: config.sentryDSN,
    release: config.sentryRelease,
    environment: getSentryEnvironment(),
    tunnel: '/tunnel',
    dataCollection: { userInfo: true },
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [/^\/klurigo-service\/api(\/|$)/],
  })
}
