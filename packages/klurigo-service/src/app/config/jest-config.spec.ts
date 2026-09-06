import { createRequire } from 'node:module'

type JestConfig = {
  testRegex: string
  globalSetup?: string
  globalTeardown?: string
  setupFiles?: string[]
}

const loadConfig = createRequire(__filename)
const unitConfig = loadConfig('../../../jest.unit.config.cjs') as JestConfig
const e2eConfig = loadConfig('../../../jest.e2e.config.cjs') as JestConfig

function matchesTest(config: JestConfig, filePath: string): boolean {
  return new RegExp(config.testRegex).test(filePath)
}

describe('backend Jest test boundaries', () => {
  it('selects unit specs without selecting e2e specs', () => {
    expect(matchesTest(unitConfig, 'src/example.spec.ts')).toBe(true)
    expect(matchesTest(unitConfig, 'src/example.e2e-spec.ts')).toBe(false)
  })

  it('selects e2e specs without selecting regular unit specs', () => {
    expect(matchesTest(e2eConfig, 'src/example.e2e-spec.ts')).toBe(true)
    expect(matchesTest(e2eConfig, 'src/example.spec.ts')).toBe(false)
  })

  it('does not configure global infrastructure setup', () => {
    expect(unitConfig.globalSetup).toBeUndefined()
    expect(unitConfig.globalTeardown).toBeUndefined()
    expect(unitConfig.setupFiles).toBeUndefined()
  })
})
