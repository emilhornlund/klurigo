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

const curlAvailable = (() => {
  try {
    execFileSync('curl', ['--version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

const wait = (milliseconds: number) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds))

const getPublishedPort = (containerId: string) =>
  (() => {
    const port = execFileSync('docker', ['port', containerId, '80/tcp'], {
      encoding: 'utf8',
    })
      .trim()
      .split(':')
      .pop()

    if (!port) throw new Error('Docker did not publish an nginx port')
    return port
  })()

const getResponseHeader = (headers: string, name: string) =>
  headers
    .split(/\r?\n/)
    .find((line) => line.toLowerCase().startsWith(`${name.toLowerCase()}:`))
    ?.slice(name.length + 1)
    .trim()

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
  })

  it('does not emit the obsolete XSS protection header', () => {
    expect(nginxTemplate).not.toContain('X-XSS-Protection')
  })

  it.skipIf(!dockerAvailable || !curlAvailable)(
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
            'KLURIGO_SERVICE_PROXY=http://127.0.0.1:9/api',
            '--env',
            'KLURIGO_SERVICE_IMAGES_PROXY=http://127.0.0.1:9/uploads/images',
            'nginx:alpine',
            'sh',
            '-c',
            "envsubst '${KLURIGO_SERVICE_PROXY} ${KLURIGO_SERVICE_IMAGES_PROXY}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -t && exec nginx -g 'daemon off;'",
          ],
          { encoding: 'utf8' },
        ).trim()

        let responseHeaders: string | undefined
        for (let attempt = 0; attempt < 30; attempt += 1) {
          try {
            const port = getPublishedPort(containerId)
            responseHeaders = execFileSync(
              'curl',
              [
                '--fail',
                '--silent',
                '--show-error',
                '--dump-header',
                '-',
                '--output',
                '/dev/null',
                `http://127.0.0.1:${port}/`,
              ],
              { encoding: 'utf8' },
            )
            break
          } catch {
            await wait(100)
          }
        }

        expect(responseHeaders).toBeDefined()
        const headers = responseHeaders ?? ''
        expect(headers).toMatch(/^HTTP\/\S+ 200 /m)
        expect(getResponseHeader(headers, 'x-frame-options')).toBe('DENY')
        expect(getResponseHeader(headers, 'x-content-type-options')).toBe(
          'nosniff',
        )
        expect(getResponseHeader(headers, 'referrer-policy')).toBe(
          'strict-origin',
        )
        expect(getResponseHeader(headers, 'permissions-policy')).toBe(
          'geolocation=(),midi=(),sync-xhr=(),microphone=(),camera=(),magnetometer=(),gyroscope=(),fullscreen=(self),payment=()',
        )
        expect(getResponseHeader(headers, 'content-security-policy')).toContain(
          "connect-src 'self' https://*.sentry.io https://*.youtube.com https://*.youtube-nocookie.com https://*.vimeo.com https://*.wistia.com https://*.spotify.com https://*.twitch.tv https://*.tiktok.com",
        )
        expect(
          getResponseHeader(headers, 'content-security-policy-report-only'),
        ).toBeUndefined()
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
