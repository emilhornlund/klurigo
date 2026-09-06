import { createRequire } from 'node:module'

type JestConfig = {
  testRegex: string
  coverageDirectory: string
  globalSetup?: string
  globalTeardown?: string
  setupFiles?: string[]
}

type ServicePackage = {
  scripts: Record<string, string>
}

const loadConfig = createRequire(__filename)
const servicePackage = loadConfig('../../../package.json') as ServicePackage
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

  it('writes unit and e2e coverage to separate directories', () => {
    expect(unitConfig.coverageDirectory).toBe('<rootDir>/coverage/unit')
    expect(e2eConfig.coverageDirectory).toBe('<rootDir>/coverage/e2e')
  })

  it('provides separate coverage commands and aggregates both suites', () => {
    expect(servicePackage.scripts['test:unit:coverage']).toBe(
      'jest --config jest.unit.config.cjs --coverage',
    )
    expect(servicePackage.scripts['test:e2e:coverage']).toBe(
      'jest --config jest.e2e.config.cjs --coverage',
    )
    expect(servicePackage.scripts['test:coverage']).toBe(
      'yarn test:unit:coverage && yarn test:e2e:coverage',
    )
  })

  it('does not configure global infrastructure setup', () => {
    expect(unitConfig.globalSetup).toBeUndefined()
    expect(unitConfig.globalTeardown).toBeUndefined()
    expect(unitConfig.setupFiles).toBeUndefined()
  })
})
