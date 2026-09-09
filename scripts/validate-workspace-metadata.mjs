import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRoot = createRequire(import.meta.url)

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'))
}

function workspacePath(relativePath) {
  return join(root, relativePath)
}

function assertField(packageName, field, actual, expected) {
  assert.equal(
    actual,
    expected,
    `${packageName}.${field} must be ${JSON.stringify(expected)}`,
  )
}

const rootPackage = readJson('package.json')
const commonPackage = readJson('packages/common/package.json')
const servicePackage = readJson('packages/klurigo-service/package.json')
const webPackage = readJson('packages/klurigo-web/package.json')
const fixturesPackage = readJson('tools/e2e-fixtures/package.json')
const migratorPackage = readJson('tools/mongodb-migrator/package.json')

assertField('klurigo', 'private', rootPackage.private, true)
assertField('klurigo', 'version', rootPackage.version, undefined)
assert.deepEqual(rootPackage.workspaces, ['packages/*', 'tools/*'])
assertField('klurigo', 'engines.node', rootPackage.engines?.node, '>=24 <25')

const workspaces = [
  ['@klurigo/common', commonPackage, 'packages/common'],
  ['@klurigo/klurigo-service', servicePackage, 'packages/klurigo-service'],
  ['@klurigo/klurigo-web', webPackage, 'packages/klurigo-web'],
  ['@klurigo/e2e-fixtures', fixturesPackage, 'tools/e2e-fixtures'],
  ['mongodb-migrator', migratorPackage, 'tools/mongodb-migrator'],
]

for (const [name, packageJson, relativePath] of workspaces) {
  assertField(name, 'name', packageJson.name, name)
  assertField(name, 'private', packageJson.private, true)
  assertField(name, 'version', packageJson.version, '1.0.0')
  assertField(name, 'engines.node', packageJson.engines?.node, '>=24 <25')
  assertField(
    name,
    'manifest',
    existsSync(workspacePath(`${relativePath}/package.json`)),
    true,
  )
}

assertField('@klurigo/common', 'type', commonPackage.type, 'commonjs')
assertField('@klurigo/common', 'main', commonPackage.main, './dist/index.js')
assertField(
  '@klurigo/common',
  'types',
  commonPackage.types,
  './dist/index.d.ts',
)
assert.deepEqual(commonPackage.files, ['dist'])
assert.deepEqual(commonPackage.exports, {
  '.': {
    types: './dist/index.d.ts',
    require: './dist/index.js',
    import: './dist/index.mjs',
  },
})

for (const output of [
  'packages/common/dist/index.js',
  'packages/common/dist/index.mjs',
  'packages/common/dist/index.d.ts',
  'packages/klurigo-service/dist/main.js',
]) {
  assertField(output, 'exists', existsSync(workspacePath(output)), true)
}

assertField('@klurigo/klurigo-service', 'type', servicePackage.type, 'commonjs')
assertField(
  '@klurigo/klurigo-service',
  'main',
  servicePackage.main,
  'dist/main.js',
)
assertField('@klurigo/e2e-fixtures', 'type', fixturesPackage.type, 'commonjs')
assertField(
  '@klurigo/e2e-fixtures',
  'main',
  fixturesPackage.main,
  './src/index.ts',
)
assertField(
  '@klurigo/e2e-fixtures',
  'types',
  fixturesPackage.types,
  './src/index.ts',
)
assertField(
  '@klurigo/e2e-fixtures',
  'source entry',
  existsSync(workspacePath('tools/e2e-fixtures/src/index.ts')),
  true,
)
assertField('mongodb-migrator', 'type', migratorPackage.type, 'commonjs')
assertField('mongodb-migrator', 'main', migratorPackage.main, 'dist/index.js')
assertField(
  'mongodb-migrator',
  'bin.mongodb-migrator',
  migratorPackage.bin?.['mongodb-migrator'],
  'dist/index.js',
)

const commonRequirePath = realpathSync(
  requireFromRoot.resolve('@klurigo/common', {
    paths: [workspacePath('packages/klurigo-service')],
  }),
)
assertField(
  '@klurigo/common require resolution',
  'path',
  commonRequirePath,
  realpathSync(workspacePath('packages/common/dist/index.js')),
)
const commonRequire = requireFromRoot('@klurigo/common')
assert(commonRequire.GameMode, '@klurigo/common CJS entry must export GameMode')

const commonImportPath = realpathSync(
  fileURLToPath(await import.meta.resolve('@klurigo/common')),
)
assertField(
  '@klurigo/common import resolution',
  'path',
  commonImportPath,
  realpathSync(workspacePath('packages/common/dist/index.mjs')),
)
const commonImport = await import('@klurigo/common')
assert(commonImport.GameMode, '@klurigo/common ESM entry must export GameMode')

for (const consumer of [
  'packages/klurigo-web',
  'packages/klurigo-service',
  'tools/mongodb-migrator',
]) {
  const resolved = realpathSync(
    requireFromRoot.resolve('@klurigo/common', {
      paths: [workspacePath(consumer)],
    }),
  )
  assertField(
    `${consumer} @klurigo/common resolution`,
    'path',
    resolved,
    realpathSync(workspacePath('packages/common/dist/index.js')),
  )
}

for (const consumer of ['packages/klurigo-web', 'packages/klurigo-service']) {
  const resolved = realpathSync(
    requireFromRoot.resolve('@klurigo/e2e-fixtures', {
      paths: [workspacePath(consumer)],
    }),
  )
  assertField(
    `${consumer} @klurigo/e2e-fixtures resolution`,
    'path',
    resolved,
    realpathSync(workspacePath('tools/e2e-fixtures/src/index.ts')),
  )
}

const migratorTarget = workspacePath(
  join('tools/mongodb-migrator', migratorPackage.bin['mongodb-migrator']),
)
const migratorResult = spawnSync(process.execPath, [migratorTarget, '--help'], {
  encoding: 'utf8',
})
assert.equal(
  migratorResult.status,
  0,
  `mongodb-migrator bin failed: ${migratorResult.stderr || migratorResult.error}`,
)

process.stdout.write(
  'Workspace package metadata and entry-point checks passed.\n',
)
