import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..')

function readRootFile(filePath) {
  return readFileSync(path.join(root, filePath), 'utf8')
}

function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
  })
}

function trackedPaths() {
  return git(['ls-files', '-z']).split('\0').filter(Boolean)
}

function gitAttributes(filePath, ...attributes) {
  return git(['check-attr', ...attributes, '--', filePath])
}

function assertIgnored(filePath) {
  try {
    git(['check-ignore', '--no-index', '--quiet', '--', filePath])
  } catch {
    assert.fail(`${filePath}: generated or local path must be ignored`)
  }
}

function assertNotIgnored(filePath) {
  try {
    git(['check-ignore', '--no-index', '--quiet', '--', filePath])
  } catch {
    return
  }

  assert.fail(`${filePath}: meaningful repository content must not be ignored`)
}

test('defines one LF text policy and explicit binary handling', () => {
  const attributes = readRootFile('.gitattributes')
  assert.match(
    attributes,
    /^\* text=auto eol=lf$/m,
    '.gitattributes: detected text must use LF checkout normalization',
  )

  for (const extension of [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'ico',
    'ttf',
    'woff',
    'woff2',
    'pdf',
    'zip',
  ]) {
    assert.match(
      attributes,
      new RegExp(`^\\*\\.${extension} binary$`, 'm'),
      `.gitattributes: *.${extension} must remain binary`,
    )
  }

  const editorConfig = readRootFile('.editorconfig')
  assert.match(
    editorConfig,
    /^\[\*\]$/m,
    '.editorconfig: all files need a policy',
  )
  for (const setting of [
    'charset = utf-8',
    'end_of_line = lf',
    'indent_style = space',
    'indent_size = 2',
    'insert_final_newline = true',
    'trim_trailing_whitespace = true',
  ]) {
    assert.match(
      editorConfig,
      new RegExp(`^${setting.replaceAll(' ', '\\s+')}$`, 'm'),
      `.editorconfig: missing ${setting}`,
    )
  }

  assert.match(
    gitAttributes('package.json', 'text', 'eol'),
    /package\.json: text: auto\npackage\.json: eol: lf/,
    'package.json: repository text attributes must be active',
  )
  assert.match(
    gitAttributes(
      'packages/klurigo-web/public/android-chrome-512x512.png',
      'text',
    ),
    /android-chrome-512x512\.png: text: unset/,
    'packages/klurigo-web/public/android-chrome-512x512.png: binary text normalization must be disabled',
  )
})

test('keeps all existing tracked text normalized', () => {
  const binaryExtensions = new Set([
    '.7z',
    '.avif',
    '.bmp',
    '.eot',
    '.gif',
    '.gz',
    '.ico',
    '.jpeg',
    '.jpg',
    '.mov',
    '.mp3',
    '.mp4',
    '.otf',
    '.pdf',
    '.png',
    '.tar',
    '.tif',
    '.ttf',
    '.wasm',
    '.webm',
    '.webp',
    '.woff',
    '.woff2',
    '.zip',
  ])

  const violations = []
  for (const filePath of trackedPaths()) {
    if (!existsSync(path.join(root, filePath))) continue

    const contents = readFileSync(path.join(root, filePath))
    const extension = path.extname(filePath).toLowerCase()
    if (binaryExtensions.has(extension) || contents.includes(0)) continue

    const text = contents.toString('utf8')
    if (text.includes('\r')) {
      violations.push(
        `${filePath}: text must not contain CRLF or CR line endings`,
      )
    }
    // Snapshot whitespace is serialized fixture data and can be meaningful.
    if (!filePath.endsWith('.snap') && /[^\S\r\n]+$/m.test(text)) {
      violations.push(`${filePath}: text must not contain trailing whitespace`)
    }
    if (contents.length > 0 && contents.at(-1) !== 0x0a) {
      violations.push(`${filePath}: text must end with a final newline`)
    }
  }

  assert.deepEqual(violations, [], violations.join('\n'))
})

test('ignores generated outputs and local state without hiding source content', () => {
  for (const filePath of [
    'packages/common/dist/index.js',
    'packages/klurigo-service/coverage/unit/lcov.info',
    'packages/klurigo-web/storybook-static/index.html',
    'packages/klurigo-web/test-results/report.json',
    'packages/klurigo-web/playwright-report/index.html',
    'packages/klurigo-web/blob-report/index.html',
    'packages/klurigo-web/playwright/.cache/state',
    'packages/klurigo-web/playwright/.auth/state.json',
    'packages/klurigo-service/public/uploads/image.png',
    'packages/klurigo-service/tsconfig.tsbuildinfo',
    'tmp/generated.ts',
    'logs/development.log',
    '.env.local',
  ]) {
    assertIgnored(filePath)
  }

  for (const filePath of [
    'package.json',
    'packages/common/src/index.ts',
    'packages/klurigo-service/test-utils/assets/photo.png',
    'packages/klurigo-web/public/favicon.svg',
    'scripts/validate-repository-hygiene.test.mjs',
  ]) {
    assertNotIgnored(filePath)
  }

  for (const filePath of trackedPaths()) {
    assert.doesNotMatch(
      filePath,
      /(^|\/)(dist|build|out|coverage|storybook-static|test-results|playwright-report|blob-report)(\/|$)|\.tsbuildinfo$/,
      `${filePath}: generated build or report output must not be tracked`,
    )
  }
})

console.log('Repository text and generated-file safeguards passed.')
