import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))

export const workspaceManifestPaths = [
  'packages/common/package.json',
  'packages/klurigo-service/package.json',
  'packages/klurigo-web/package.json',
  'tools/e2e-fixtures/package.json',
  'tools/mongodb-migrator/package.json',
]

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'))
}

function unquote(value) {
  return value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value
}

function splitSelectors(header) {
  return header.split(', ').map((value) => unquote(value))
}

export function parseYarnLock(lockfile) {
  const entries = new Map()
  const lines = lockfile.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line || line.startsWith(' ') || !line.endsWith(':')) continue

    const selectors = splitSelectors(line.slice(0, -1))
    let version
    for (
      index += 1;
      index < lines.length && lines[index].startsWith(' ');
      index += 1
    ) {
      const match = lines[index].match(/^  version "([^"]+)"$/)
      if (match) version = match[1]
    }
    index -= 1

    if (version) {
      for (const selector of selectors) entries.set(selector, version)
    }
  }

  return entries
}

export function findDirectVersionSkew(manifests, lockEntries) {
  const declarations = new Map()

  for (const { path, packageJson } of manifests) {
    for (const section of ['dependencies', 'devDependencies']) {
      for (const [name, range] of Object.entries(packageJson[section] ?? {})) {
        const version = lockEntries.get(`${name}@${range}`)
        if (!version) continue

        const versions = declarations.get(name) ?? new Map()
        const workspaces = versions.get(version) ?? []
        workspaces.push({ path, range, section })
        versions.set(version, workspaces)
        declarations.set(name, versions)
      }
    }
  }

  return [...declarations.entries()]
    .filter(([, versions]) => versions.size > 1)
    .map(([name, versions]) => ({ name, versions }))
}

export function formatVersionSkew(issues) {
  return issues.flatMap(({ name, versions }) => [
    `[dependency-hygiene] category=duplicate-versions dependency=${name}`,
    ...[...versions.entries()].flatMap(([version, declarations]) =>
      declarations.map(
        ({ path, range, section }) =>
          `[dependency-hygiene] category=duplicate-versions workspace=${path} dependency=${name} declared=${range} resolved=${version} section=${section}`,
      ),
    ),
  ])
}

export function runDirectVersionCheck({ manifests, lockEntries, stdout }) {
  const issues = findDirectVersionSkew(manifests, lockEntries)
  if (issues.length === 0) {
    stdout.write(
      '[dependency-hygiene] category=duplicate-versions direct dependency versions are consistent\n',
    )
    return 0
  }

  for (const line of formatVersionSkew(issues)) stdout.write(`${line}\n`)
  return 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifests = workspaceManifestPaths.map((path) => ({
    path,
    packageJson: readJson(path),
  }))
  const lockEntries = parseYarnLock(
    readFileSync(resolve(root, 'yarn.lock'), 'utf8'),
  )
  process.exitCode = runDirectVersionCheck({
    manifests,
    lockEntries,
    stdout: process.stdout,
  })
}
