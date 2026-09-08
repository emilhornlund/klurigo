import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prettier from 'prettier'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = async (filePath) =>
  JSON.parse(await fs.readFile(path.join(root, filePath), 'utf8'))

const config = await readJson('.prettierrc')
assert.deepEqual(config, {
  bracketSpacing: true,
  printWidth: 80,
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
  overrides: [
    {
      files: 'packages/klurigo-web/**/*',
      options: {
        bracketSameLine: true,
      },
    },
  ],
})

const packageJson = await readJson('package.json')
assert.equal(
  packageJson.scripts.format,
  'yarn format:config && prettier --write . --ignore-path .prettierignore',
)
assert.equal(
  packageJson.scripts['format:check'],
  'yarn format:config && prettier --check . --ignore-path .prettierignore',
)
assert.doesNotMatch(packageJson.scripts['format:check'], /--write/)

for (const workspace of [
  'packages/common',
  'packages/klurigo-service',
  'packages/klurigo-web',
  'tools/e2e-fixtures',
  'tools/mongodb-migrator',
]) {
  const workspacePackage = await readJson(`${workspace}/package.json`)
  assert.equal(workspacePackage.scripts.format, undefined)
  assert.equal(workspacePackage.scripts['format:check'], undefined)
  await assert.rejects(fs.access(path.join(root, workspace, '.prettierrc')))
}

const sharedConfig = await prettier.resolveConfig(
  path.join(root, 'packages/common/src/index.ts'),
)
assert.equal(sharedConfig.bracketSpacing, true)
assert.equal(sharedConfig.printWidth, 80)
assert.equal(sharedConfig.semi, false)
assert.equal(sharedConfig.singleQuote, true)
assert.equal(sharedConfig.tabWidth, 2)
assert.equal(sharedConfig.trailingComma, 'all')
assert.equal(sharedConfig.useTabs, false)

const webConfig = await prettier.resolveConfig(
  path.join(root, 'packages/klurigo-web/src/main.tsx'),
)
assert.equal(webConfig.bracketSameLine, true)

assert.equal(
  await prettier.check("const value = 'value';\n", {
    filepath: path.join(root, 'packages/common/src/index.ts'),
  }),
  false,
)

for (const ignoredPath of [
  'node_modules/prettier/package.json',
  'packages/common/dist/index.js',
  'packages/klurigo-web/playwright-report/index.html',
  'packages/klurigo-web/playwright/.auth/state.json',
  'packages/klurigo-service/public/uploads/image.png',
  'tmp/generated.ts',
]) {
  const fileInfo = await prettier.getFileInfo(path.join(root, ignoredPath), {
    ignorePath: path.join(root, '.prettierignore'),
  })
  assert.equal(fileInfo.ignored, true, `${ignoredPath} must be ignored`)
}

console.log('Prettier configuration and command validation passed.')
