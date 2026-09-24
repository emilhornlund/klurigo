import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const nginxTemplate = readFileSync(
  resolve(process.cwd(), 'nginx.conf.template'),
  'utf8',
)

const frontendLocation = nginxTemplate.slice(
  nginxTemplate.indexOf('    location / {'),
  nginxTemplate.indexOf('    location /tunnel {'),
)

describe('production frontend security headers', () => {
  it('defines security headers directly in the frontend location', () => {
    expect(frontendLocation).toContain(
      'add_header X-Frame-Options "DENY" always;',
    )
    expect(frontendLocation).toContain(
      'add_header X-Content-Type-Options nosniff always;',
    )
    expect(frontendLocation).toContain(
      'add_header Referrer-Policy "strict-origin" always;',
    )
    expect(frontendLocation).toContain(
      'add_header Permissions-Policy "geolocation=(),midi=(),sync-xhr=(),microphone=(),camera=(),magnetometer=(),gyroscope=(),fullscreen=(self),payment=()" always;',
    )
  })

  it('enforces a restrictive CSP for frontend responses', () => {
    expect(frontendLocation).toContain('add_header Content-Security-Policy "')

    for (const directive of [
      "default-src 'self'",
      "script-src 'self' https://www.youtube.com https://fast.wistia.com https://open.spotify.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https:",
      'frame-src',
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]) {
      expect(frontendLocation).toContain(directive)
    }

    expect(frontendLocation).not.toContain("script-src 'self' 'unsafe-eval'")
    expect(frontendLocation).not.toContain("script-src 'self' 'unsafe-inline'")
  })

  it('does not emit the obsolete XSS protection header', () => {
    expect(nginxTemplate).not.toContain('X-XSS-Protection')
  })
})
