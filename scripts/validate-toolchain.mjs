import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(
  readFileSync(resolve(root, 'package.json'), 'utf8'),
)
const nodeRange = packageJson.engines?.node
const packageManager = packageJson.packageManager
const nodeRangeMatch = /^>=(\d+) <(\d+)$/.exec(nodeRange ?? '')
const packageManagerMatch = /^yarn@(\d+\.\d+\.\d+)$/.exec(packageManager ?? '')

assert(
  nodeRangeMatch,
  'The root Node.js engine must use a supported range such as ">=24 <25".',
)
assert(
  packageManagerMatch,
  'The root packageManager must declare an exact Yarn version such as "yarn@1.22.22".',
)

const [, minimumNodeMajor, maximumNodeMajor] = nodeRangeMatch
const nodeMajor = Number(process.versions.node.split('.')[0])

assert(
  nodeMajor >= Number(minimumNodeMajor) && nodeMajor < Number(maximumNodeMajor),
  `Unsupported Node.js version ${process.versions.node}. This repository requires Node.js ${nodeRange}; use the version in .nvmrc.`,
)

const expectedYarnVersion = packageManagerMatch[1]
const yarnResult = spawnSync('yarn', ['--version'], {
  cwd: root,
  encoding: 'utf8',
})

assert.equal(
  yarnResult.status,
  0,
  `Unable to run Yarn ${expectedYarnVersion}. Enable the repository toolchain with "corepack enable".`,
)

const actualYarnVersion = yarnResult.stdout.trim()
assert.equal(
  actualYarnVersion,
  expectedYarnVersion,
  `Unsupported Yarn version ${actualYarnVersion || '<unavailable>'}. This repository requires Yarn Classic ${expectedYarnVersion}; run "corepack enable".`,
)

console.log(
  `Toolchain OK: Node.js ${process.versions.node}, Yarn ${actualYarnVersion}.`,
)
