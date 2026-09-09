# Dependency Hygiene

The repository has five Yarn workspaces. The hygiene check covers all five:

| Workspace                  | Source and entry-point evidence used by the check                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@klurigo/common`          | `src/index.ts`, tsup and Vitest configuration, and unit specs; the package exports built CJS, ESM, and declaration entry points                         |
| `@klurigo/klurigo-service` | Nest `src/main.ts`, all Jest unit and e2e specs, e2e scripts, Jest configs, and `nest-cli.json`                                                         |
| `@klurigo/klurigo-web`     | Vite `src/main.tsx`, unit tests, Storybook stories and `.storybook`, Playwright specs/configuration, Vitest configuration, and TypeScript configuration |
| `@klurigo/e2e-fixtures`    | Direct source `src/index.ts`; this workspace intentionally does not build to `dist`                                                                     |
| `mongodb-migrator`         | CLI `src/index.ts` and all migrator source; its built `dist/index.js` is the package and bin entry point                                                |

## Baseline Audit

The baseline was run against every manifest, the source and test trees, build and
test configuration, package entry points, and `yarn.lock`. Findings are
classified before any change; a static report alone is not evidence to remove a
dependency, export, or file.

| Category                      | Baseline result                                                                                                                                                                                              | Classification and action                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unused dependencies           | Knip reported `ts-loader`, `tsconfig-paths`, and `webpack` in the service                                                                                                                                    | Confirmed after checking `nest-cli.json`, build scripts, test configs, and source imports; removed from the service manifest.                                                                                   |
| Missing dependencies          | Knip reported the `rimraf` binary used by the migrator clean script                                                                                                                                          | Confirmed by the manifest script and fixed by declaring `rimraf` in the migrator devDependencies.                                                                                                               |
| Unused exports                | Knip reported many service schema/decorator exports and web component barrel exports                                                                                                                         | False positives or intentional private barrel/runtime surfaces. The service is Nest-discovered from `src/main.ts`, and the web has Storybook and component entry surfaces. No exports were removed.             |
| Unused files                  | The initial report treated Jest e2e specs and service test helpers as unused. Explicit Jest, Playwright, Storybook, and Vitest entries reduce this to a few barrel files.                                    | Not reliably actionable without changing framework discovery conventions. The remaining candidates are audit findings, not an enforced gate. An empty service barrel with no imports was confirmed and removed. |
| Duplicate exports             | Three common constants have equal-value aliases (`QUIZ_MIN_POINTS`/`QUIZ_ZERO_POINTS`, `QUIZ_MAX_POINTS`/`QUIZ_DOUBLE_POINTS`, and the zero-to-one-hundred aliases).                                         | Intentional domain aliases. No API change was made.                                                                                                                                                             |
| Duplicate dependency versions | `yarn.lock` contains transitive version duplication, including router, UUID, Nodemailer, and Multer versions. No package has direct declarations resolving to different versions across the five workspaces. | Transitive duplication is unavoidable unless upstream ranges change. The permanent check reports direct version skew only.                                                                                      |
| Deprecated packages           | `yarn.lock` records resolved versions and integrity, not npm deprecation metadata. `yarn outdated` reports version age, not deprecation status.                                                              | Not reliably detectable from a frozen install. Deprecation metadata requires a registry request and is not a CI gate. This is distinct from security auditing and general outdated-package reporting.           |

Knip was selected because it provides useful dependency, unlisted dependency,
and binary evidence for this TypeScript workspace without requiring source
rewrites. Its broad exports and files reports were not made a permanent gate:
doing so would require suppressing valid framework and package-surface findings.
The configuration in [`knip.jsonc`](../../knip.jsonc) uses named entry points
instead of broad workspace exclusions. Its only exclusion is the root
`@klurigo/common` dependency used by the metadata validation script to inspect a
workspace package; the root package does not ship that dependency.

## Check

Run the deterministic root check after a frozen-lockfile installation:

```sh
corepack enable
yarn install --frozen-lockfile
yarn dependency:hygiene
```

The command runs Knip for unused dependencies, missing/unlisted dependencies,
and unlisted binaries, then checks direct dependency version skew in
`yarn.lock`. Failures include the Knip category and package path, or
`category=duplicate-versions` with the workspace, dependency, declared range,
and resolved version. It does not make registry requests, require MongoDB,
Redis, Playwright browsers, or build artifacts.

The check is enforced in the reusable static-build CI job after installation.
The existing build, typecheck, lint, formatting, circular-dependency, and unit
test workflows remain separate and unchanged. The check is deliberately not a
security scanner, general outdated-package report, or deprecation metadata
service.

When a future finding is reported, verify package scripts, build output, test
discovery, Storybook, Playwright, Nest decorators/modules, CLI entry points, and
package exports before changing a manifest or source surface.
