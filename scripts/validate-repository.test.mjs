import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { runValidation, validationStages } from './validate-repository.mjs'

const rootPackage = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
)
const workspacePackages = new Map(
  [
    '../packages/common/package.json',
    '../packages/klurigo-service/package.json',
    '../packages/klurigo-web/package.json',
  ].map((packagePath) => {
    const packageJson = JSON.parse(
      readFileSync(new URL(packagePath, import.meta.url), 'utf8'),
    )
    return [packageJson.name, packageJson]
  }),
)
const buildWorkflow = readFileSync(
  new URL('../.github/workflows/build.yml', import.meta.url),
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

function workflowJob(name) {
  const lines = buildWorkflow.split('\n')
  const start = lines.indexOf(`  ${name}:`)
  assert.notEqual(start, -1, `workflow job ${name} must exist`)

  const end = lines.findIndex(
    (line, index) => index > start && /^  [A-Za-z0-9_-]+:$/.test(line),
  )
  return lines.slice(start, end === -1 ? lines.length : end).join('\n')
}

function workflowRunCommands(job) {
  return [...job.matchAll(/^ {8}run: (.+)$/gm)]
    .map(([, command]) => command)
    .filter((command) => command.startsWith('yarn '))
}

function assertCommandsInOrder(job, commands) {
  let offset = 0
  for (const command of commands) {
    const commandOffset = job.indexOf(`run: ${command}`, offset)
    assert.notEqual(commandOffset, -1, `missing workflow command: ${command}`)
    offset = commandOffset + command.length
  }
}

function assertYarnCommandResolves(command) {
  if (command === 'yarn install --frozen-lockfile') {
    return
  }

  const parts = command.split(' ')
  if (parts[1] === 'workspace') {
    const workspace = workspacePackages.get(parts[2])
    assert.ok(workspace, `unknown workspace in workflow command: ${command}`)

    // Browser installation is intentionally a CI-only Playwright invocation;
    // the package script installs only the browsers needed for local runs.
    if (parts[3] === 'playwright') {
      assert.equal(parts[4], 'install')
      return
    }

    assert.ok(
      workspace.scripts?.[parts[3]],
      `unknown workspace script in workflow command: ${command}`,
    )
    return
  }

  assert.ok(
    rootPackage.scripts?.[parts[1]],
    `unknown root script in workflow command: ${command}`,
  )
}

test('wires the root validation command to the validation runner', () => {
  assert.equal(
    rootPackage.scripts.validate,
    'node scripts/validate-repository.mjs',
  )
})

test('runs the standard validation commands in order', () => {
  const calls = []
  const stdout = outputBuffer()

  const result = runValidation({
    runCommand(command) {
      calls.push(command)
      return { status: 0 }
    },
    stdout,
    stderr: outputBuffer(),
  })

  assert.equal(result, 0)
  assert.deepEqual(
    calls,
    validationStages.map(({ command }) => command),
  )
  assert.match(stdout.value, /All repository validation checks passed/)
})

test('reports the failed stage, keeps diagnostics, and stops there', () => {
  const calls = []
  const stdout = outputBuffer()
  const stderr = outputBuffer()
  const failedStageIndex = 3
  const diagnostic = 'Prettier found a file that needs formatting'

  const result = runValidation({
    runCommand(command) {
      calls.push(command)
      if (calls.length - 1 === failedStageIndex) {
        stderr.write(`${diagnostic}\n`)
        return { status: 23 }
      }
      return { status: 0 }
    },
    stdout,
    stderr,
  })

  assert.equal(result, 23)
  assert.deepEqual(
    calls,
    validationStages
      .slice(0, failedStageIndex + 1)
      .map(({ command }) => command),
  )
  assert.match(stderr.value, new RegExp(diagnostic))
  assert.match(stderr.value, /FAILED: Formatting verification \(exit code 23\)/)
  assert.doesNotMatch(stdout.value, /All repository validation checks passed/)
})

test('resolves every Yarn command in the build workflow', () => {
  const commands = workflowRunCommands(buildWorkflow)

  assert.ok(commands.length > 0)
  commands.forEach(assertYarnCommandResolves)
})

test('keeps static, unit coverage, backend e2e, and frontend e2e commands separate', () => {
  const staticJob = workflowJob('static-build')
  const unitCoverageJob = workflowJob('unit-coverage')
  const backendE2eJob = workflowJob('backend-e2e-coverage')
  const frontendE2eJob = workflowJob('frontend-e2e')

  assertCommandsInOrder(staticJob, [
    'yarn build',
    'yarn typecheck',
    'yarn lint',
    'yarn format:check',
    'yarn workspace @klurigo/klurigo-service check-circular-deps',
  ])
  assertCommandsInOrder(unitCoverageJob, [
    'yarn workspace @klurigo/common build',
    'yarn test:unit:coverage',
  ])
  assertCommandsInOrder(backendE2eJob, [
    'yarn workspace @klurigo/common build',
    'yarn workspace @klurigo/klurigo-service test:e2e:coverage',
  ])
  assertCommandsInOrder(frontendE2eJob, [
    'yarn workspace @klurigo/common build',
    'yarn workspace @klurigo/klurigo-web test:e2e',
  ])

  assert.match(
    backendE2eJob,
    /run: docker compose up -d --wait mongodb redis[\s\S]*run: yarn workspace @klurigo\/klurigo-service test:e2e:coverage[\s\S]*if: always\(\)[\s\S]*run: docker compose down -v/,
  )
  assert.match(
    frontendE2eJob,
    /run: docker compose up -d --wait mongodb redis[\s\S]*run: yarn workspace @klurigo\/klurigo-web playwright install chromium firefox webkit --with-deps[\s\S]*env:\n          CI: 'true'[\s\S]*run: yarn workspace @klurigo\/klurigo-web test:e2e[\s\S]*if: always\(\)[\s\S]*run: docker compose down -v/,
  )

  assert.match(frontendE2eJob, /if: \$\{\{ inputs\.run_e2e \}\}/)
  assert.match(staticJob, /if: github\.ref == 'refs\/heads\/main'/)
  assert.match(
    staticJob,
    /name: klurigo-sentry-artifacts[\s\S]*path: packages\/klurigo-web\/dist\/assets\/\*\*\/\*\.map/,
  )
  assert.match(
    staticJob,
    /name: klurigo-service-sentry-artifacts[\s\S]*path: packages\/klurigo-service\/dist\/\*\*\/\*\.map/,
  )

  for (const [path, flag] of [
    ['./packages/common/coverage/lcov.info', 'common'],
    ['./packages/klurigo-web/coverage/lcov.info', 'klurigo-web'],
    [
      './packages/klurigo-service/coverage/unit/lcov.info',
      'klurigo-service-unit',
    ],
  ]) {
    assert.match(
      unitCoverageJob,
      new RegExp(
        `files: ${path.replaceAll('.', '\\.')}[\\s\\S]*flags: ${flag}[\\s\\S]*disable_search: true[\\s\\S]*fail_ci_if_error: true[\\s\\S]*verbose: true`,
      ),
    )
  }

  assert.match(
    backendE2eJob,
    /files: \.\/packages\/klurigo-service\/coverage\/e2e\/lcov\.info[\s\S]*flags: klurigo-service-e2e/,
  )
  assert.match(
    backendE2eJob,
    /disable_search: true[\s\S]*fail_ci_if_error: true/,
  )
})
