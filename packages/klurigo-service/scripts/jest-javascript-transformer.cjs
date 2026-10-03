/* eslint-disable @typescript-eslint/no-require-imports */
const ts = require('typescript')

module.exports = {
  process(sourceText, sourcePath) {
    const isEsm =
      /^\s*(?:import\s+(?:.+?\s+from\s+)?['"]|export\s+(?:\*|default|\{))/m.test(
        sourceText,
      )
    const transformedSource = isEsm
      ? sourceText
          .replaceAll('import.meta.url', '__filename')
          .replaceAll('import.meta.resolve', 'require.resolve')
          .replaceAll(
            'const require = createRequire(__filename)',
            'const moduleRequire = createRequire(__filename)',
          )
          .replaceAll('require(', 'moduleRequire(')
      : sourceText

    const { outputText } = ts.transpileModule(transformedSource, {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        sourceMap: false,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: sourcePath || 'jest-transform.js',
    })

    return { code: outputText }
  },
}
