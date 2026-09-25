import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const nginxTemplate = readFileSync(
  resolve(process.cwd(), 'nginx.conf.template'),
  'utf8',
)

const frontendLocation = nginxTemplate.slice(
  nginxTemplate.indexOf('    location / {'),
  nginxTemplate.indexOf('    location /tunnel {'),
)

const dockerAvailable = (() => {
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

const wait = (milliseconds: number) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds))

const getPublishedPort = (containerId: string) =>
  execFileSync('docker', ['port', containerId, '80/tcp'], {
    encoding: 'utf8',
  })
    .trim()
    .split(':')
    .pop()

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
    expect(nginxTemplate).not.toContain(
      'add_header Content-Security-Policy-Report-Only "',
    )
    expect(nginxTemplate).not.toContain("connect-src 'self' http: https:")

    for (const directive of [
      "default-src 'self'",
      "script-src 'self' https://www.youtube.com https://fast.wistia.com https://open.spotify.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https:",
      'frame-src',
      "connect-src 'self' https://*.sentry.io https://*.youtube.com https://*.youtube-nocookie.com https://*.vimeo.com https://*.wistia.com https://*.spotify.com https://*.twitch.tv https://*.tiktok.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]) {
      expect(frontendLocation).toContain(directive)
    }

    expect(frontendLocation).not.toContain("script-src 'self' 'unsafe-eval'")
    expect(frontendLocation).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(frontendLocation).not.toContain(
      'add_header Content-Security-Policy-Report-Only "',
    )
  })

  it('does not emit the obsolete XSS protection header', () => {
    expect(nginxTemplate).not.toContain('X-XSS-Protection')
  })

  it.skipIf(!dockerAvailable)(
    'renders valid nginx configuration and serves the security headers',
    async () => {
      const temporaryDirectory = mkdtempSync(
        join(tmpdir(), 'klurigo-nginx-security-'),
      )
      const documentRoot = join(temporaryDirectory, 'html')
      const templatePath = join(temporaryDirectory, 'nginx.conf.template')
      mkdirSync(documentRoot)
      writeFileSync(templatePath, nginxTemplate)
      writeFileSync(join(documentRoot, 'index.html'), '<!doctype html>')

      let containerId: string | undefined
      try {
        containerId = execFileSync(
          'docker',
          [
            'run',
            '--detach',
            '--rm',
            '--publish',
            '127.0.0.1::80',
            '--volume',
            `${templatePath}:/etc/nginx/nginx.conf.template:ro`,
            '--volume',
            `${documentRoot}:/usr/share/nginx/html:ro`,
            '--env',
            'KLURIGO_SERVICE_PROXY=http://service:8080/api',
            '--env',
            'KLURIGO_SERVICE_IMAGES_PROXY=http://service:8080/uploads/images',
            'nginx:alpine',
            'sh',
            '-c',
            "envsubst '${KLURIGO_SERVICE_PROXY} ${KLURIGO_SERVICE_IMAGES_PROXY}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -t && exec nginx -g 'daemon off;'",
          ],
          { encoding: 'utf8' },
        ).trim()

        let response: Response | undefined
        for (let attempt = 0; attempt < 30; attempt += 1) {
          try {
            const port = getPublishedPort(containerId)
            response = await fetch(`http://127.0.0.1:${port}/`)
            break
          } catch {
            await wait(100)
          }
        }

        expect(response).toBeDefined()
        expect(response?.status).toBe(200)
        expect(response?.headers.get('x-frame-options')).toBe('DENY')
        expect(response?.headers.get('x-content-type-options')).toBe('nosniff')
        expect(response?.headers.get('referrer-policy')).toBe('strict-origin')
        expect(response?.headers.get('permissions-policy')).toBe(
          'geolocation=(),midi=(),sync-xhr=(),microphone=(),camera=(),magnetometer=(),gyroscope=(),fullscreen=(self),payment=()',
        )
        expect(response?.headers.get('content-security-policy')).toContain(
          "connect-src 'self' https://*.sentry.io https://*.youtube.com https://*.youtube-nocookie.com https://*.vimeo.com https://*.wistia.com https://*.spotify.com https://*.twitch.tv https://*.tiktok.com",
        )
        expect(
          response?.headers.get('content-security-policy-report-only'),
        ).toBeNull()
      } finally {
        if (containerId) {
          try {
            execFileSync('docker', ['rm', '--force', containerId], {
              stdio: 'ignore',
            })
          } catch {
            // The container may have exited after an invalid configuration.
          }
        }
        rmSync(temporaryDirectory, { recursive: true, force: true })
      }
    },
    120_000,
  )
})
