import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { runValidation, validationStages } from './validate-repository.mjs'

const rootPackage = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
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
