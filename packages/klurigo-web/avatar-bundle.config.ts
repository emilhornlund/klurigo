import { gzipSync } from 'node:zlib'

import { defineConfig } from 'vite'

/** Reproducible Phase 0 measurement, in memory; no application entry is changed. */
export default defineConfig({
  build: {
    write: false,
    minify: true,
    sourcemap: false,
    lib: {
      entry: 'src/utils/avatar/critters-v1.ts',
      formats: ['es'],
      fileName: 'critters-v1',
    },
  },
  plugins: [
    {
      name: 'measure-local-avatar-bundle',
      generateBundle(_options, bundle) {
        for (const output of Object.values(bundle)) {
          if (output.type === 'chunk') {
            console.info(
              `${output.fileName}: ${Buffer.byteLength(output.code)} bytes / ${gzipSync(output.code).length} bytes gzip`,
            )
          }
        }
      },
    },
  ],
})
