import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const yarnCommand = process.platform === 'win32' ? 'yarn.cmd' : 'yarn'

export const validationStages = [
  { name: 'Build', command: ['build'] },
  { name: 'TypeScript checks', command: ['check-types'] },
  { name: 'Linting', command: ['lint'] },
  { name: 'Formatting verification', command: ['format:check'] },
  {
    name: 'Circular-dependency validation',
    command: ['workspace', '@klurigo/klurigo-service', 'check-circular-deps'],
  },
  { name: 'Aggregate unit tests', command: ['test'] },
]

function formatCommand(command) {
  return ['yarn', ...command].join(' ')
}

function runYarnCommand(command) {
  return spawnSync(yarnCommand, command, {
    cwd: root,
    stdio: 'inherit',
  })
}

export function runValidation({
  runCommand = runYarnCommand,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  for (const stage of validationStages) {
    stdout.write(
      `\n[validate] ${stage.name}: ${formatCommand(stage.command)}\n`,
    )

    let result
    try {
      result = runCommand(stage.command)
    } catch (error) {
      stderr.write(
        `[validate] FAILED: ${stage.name} (${error.message || 'command error'})\n`,
      )
      return 1
    }

    if (result.status !== 0) {
      const reason = result.error
        ? ` (${result.error.message})`
        : result.signal
          ? ` (terminated by ${result.signal})`
          : ` (exit code ${result.status ?? 1})`
      stderr.write(`[validate] FAILED: ${stage.name}${reason}\n`)
      return result.status ?? 1
    }

    stdout.write(`[validate] Passed: ${stage.name}\n`)
  }

  stdout.write('\n[validate] All repository validation checks passed.\n')
  return 0
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  process.exitCode = runValidation()
}
