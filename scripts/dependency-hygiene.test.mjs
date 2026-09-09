import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  findDirectVersionSkew,
  formatVersionSkew,
  parseYarnLock,
  runDirectVersionCheck,
  workspaceManifestPaths,
} from './check-direct-dependency-versions.mjs'

const rootPackage = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url)),
)
const knipConfig = readFileSync(
  new URL('../knip.jsonc', import.meta.url),
  'utf8',
)

function outputBuffer() {
  let value = ''
  return {
    write(chunk) {
      value += chunk
    },
    get value() {
      return value
    },
  }
}

test('wires one root hygiene command to Knip and the lockfile check', () => {
  assert.match(
    rootPackage.scripts['dependency:hygiene'],
    /^knip --config knip\.jsonc --include dependencies,unlisted,binaries .* && node scripts\/check-direct-dependency-versions\.mjs$/,
  )
})

test('covers every declared workspace and its non-standard entry points', () => {
  assert.deepEqual(workspaceManifestPaths, [
    'packages/common/package.json',
    'packages/klurigo-service/package.json',
    'packages/klurigo-web/package.json',
    'tools/e2e-fixtures/package.json',
    'tools/mongodb-migrator/package.json',
  ])

  for (const workspace of [
    '.',
    'packages/common',
    'packages/klurigo-service',
    'packages/klurigo-web',
    'tools/e2e-fixtures',
    'tools/mongodb-migrator',
  ]) {
    assert.match(knipConfig, new RegExp(`"${workspace.replace('.', '\\.')}":`))
  }

  for (const entry of [
    'src/index.ts',
    'src/main.ts',
    'src/main.tsx',
    'src/setupTests.ts',
    'e2e-tests/**/*.spec.ts',
    '.storybook/**/*.{ts,tsx}',
    'scripts/**/*.ts',
  ]) {
    assert.match(
      knipConfig,
      new RegExp(entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    )
  }

  assert.match(knipConfig, /"ignoreDependencies": \["@klurigo\/common"\]/)
  assert.doesNotMatch(
    knipConfig,
    /"ignore(File|Exports|Binaries|Unlisted|Types)": \[/,
  )
})

test('parses grouped Yarn lock selectors and detects direct version skew', () => {
  const lockEntries = parseYarnLock(`
shared@^1.0.0, shared@^1.1.0:
  version "1.1.0"

shared@^2.0.0:
  version "2.0.0"
`)

  assert.equal(lockEntries.get('shared@^1.0.0'), '1.1.0')
  assert.equal(lockEntries.get('shared@^1.1.0'), '1.1.0')
  assert.equal(lockEntries.get('shared@^2.0.0'), '2.0.0')

  const issues = findDirectVersionSkew(
    [
      {
        path: 'packages/one/package.json',
        packageJson: { dependencies: { shared: '^1.0.0' } },
      },
      {
        path: 'packages/two/package.json',
        packageJson: { dependencies: { shared: '^2.0.0' } },
      },
    ],
    lockEntries,
  )

  assert.equal(issues.length, 1)
  assert.equal(issues[0].name, 'shared')
  assert.match(
    formatVersionSkew(issues).join('\n'),
    /category=duplicate-versions workspace=packages\/two\/package\.json dependency=shared declared=\^2\.0\.0 resolved=2\.0\.0/,
  )
})

test('does not report unavoidable transitive duplication', () => {
  const output = outputBuffer()
  const status = runDirectVersionCheck({
    manifests: [
      {
        path: 'packages/web/package.json',
        packageJson: { dependencies: { router: '^8.0.0' } },
      },
    ],
    lockEntries: new Map([
      ['router@^8.0.0', '8.0.0'],
      ['router@^7.0.0', '7.0.0'],
    ]),
    stdout: output,
  })

  assert.equal(status, 0)
  assert.match(output.value, /direct dependency versions are consistent/)
})

test('reports direct version failures with workspace and category', () => {
  const output = outputBuffer()
  const status = runDirectVersionCheck({
    manifests: [
      {
        path: 'packages/one/package.json',
        packageJson: { dependencies: { shared: '^1.0.0' } },
      },
      {
        path: 'packages/two/package.json',
        packageJson: { dependencies: { shared: '^2.0.0' } },
      },
    ],
    lockEntries: new Map([
      ['shared@^1.0.0', '1.0.0'],
      ['shared@^2.0.0', '2.0.0'],
    ]),
    stdout: output,
  })

  assert.equal(status, 1)
  assert.match(output.value, /category=duplicate-versions/)
  assert.match(output.value, /workspace=packages\/one\/package\.json/)
  assert.match(output.value, /dependency=shared/)
})
