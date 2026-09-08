import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const paths = {
  common: resolve(root, "packages/common"),
  service: resolve(root, "packages/klurigo-service"),
  web: resolve(root, "packages/klurigo-web"),
  e2eFixtures: resolve(root, "tools/e2e-fixtures"),
  migrator: resolve(root, "tools/mongodb-migrator"),
};

const configFiles = {
  common: resolve(paths.common, "eslint.config.mjs"),
  service: resolve(paths.service, "eslint.config.mjs"),
  web: resolve(paths.web, "eslint.config.mjs"),
  e2eFixtures: resolve(paths.e2eFixtures, "eslint.config.mjs"),
  migrator: resolve(paths.migrator, "eslint.config.mjs"),
};

async function createLintResult(workspace, filePath, code) {
  const eslint = new ESLint({
    cwd: paths[workspace],
    overrideConfigFile: configFiles[workspace],
  });

  const [result] = await eslint.lintText(code, { filePath });
  return result;
}

async function getConfig(workspace, filePath) {
  const eslint = new ESLint({
    cwd: paths[workspace],
    overrideConfigFile: configFiles[workspace],
  });

  return eslint.calculateConfigForFile(filePath);
}

function severity(config, rule) {
  return config.rules[rule]?.[0] ?? config.rules[rule];
}

function assertClean(result, description) {
  assert.equal(
    result.errorCount,
    0,
    `${description} produced lint errors:\n${result.messages
      .map(({ message, ruleId }) => `${ruleId}: ${message}`)
      .join("\n")}`,
  );
}

function assertRule(result, rule, description) {
  assert(
    result.messages.some((message) => message.ruleId === rule),
    `${description} did not exercise ${rule}`,
  );
}

const commonConfig = await getConfig("common", "src/index.ts");
const serviceConfig = await getConfig("service", "src/main.ts");
const serviceSpecConfig = await getConfig("service", "src/example.spec.ts");
const webConfig = await getConfig("web", "src/main.tsx");
const webToolConfig = await getConfig("web", "vite.config.ts");
const e2eFixturesConfig = await getConfig("e2eFixtures", "src/index.ts");
const migratorConfig = await getConfig("migrator", "src/index.ts");

for (const [name, config] of Object.entries({
  common: commonConfig,
  service: serviceConfig,
  e2eFixtures: e2eFixturesConfig,
  migrator: migratorConfig,
})) {
  assert.equal(
    severity(config, "prettier/prettier"),
    2,
    `${name} Prettier rule`,
  );
  assert.equal(
    severity(config, "import/order"),
    2,
    `${name} import order rule`,
  );
  assert.equal(
    severity(config, "import/extensions"),
    2,
    `${name} import extensions rule`,
  );
  assert.equal(
    severity(config, "sort-imports"),
    2,
    `${name} sort imports rule`,
  );
  assert.equal(
    config.languageOptions.globals.process,
    false,
    `${name} Node globals`,
  );
  assert.equal(
    config.languageOptions.globals.window,
    undefined,
    `${name} browser globals`,
  );
}

assert.equal(
  webConfig.languageOptions.globals.window,
  false,
  "web browser globals",
);
assert.equal(
  webConfig.languageOptions.globals.process,
  undefined,
  "web source Node globals",
);
assert.equal(
  webToolConfig.languageOptions.globals.process,
  false,
  "web tool Node globals",
);
assert.equal(
  webToolConfig.languageOptions.globals.window,
  undefined,
  "web tool browser globals",
);
assert.equal(
  severity(webConfig, "react-hooks/rules-of-hooks"),
  2,
  "React Hooks rules",
);
assert.equal(
  severity(webConfig, "react-refresh/only-export-components"),
  1,
  "React Refresh rule",
);
assert.equal(
  severity(webConfig, "react/prop-types"),
  0,
  "React prop-types exception",
);
assert.equal(
  severity(webToolConfig, "react-hooks/rules-of-hooks"),
  undefined,
  "non-React tool rules",
);
assert.equal(
  severity(serviceConfig, "@typescript-eslint/no-explicit-any"),
  2,
  "service any rule",
);
assert.equal(
  severity(serviceSpecConfig, "@typescript-eslint/no-explicit-any"),
  0,
  "service spec any exception",
);

assertRule(
  await createLintResult(
    "common",
    "src/config-check.ts",
    'const value={foo:"bar"}\n',
  ),
  "prettier/prettier",
  "shared formatting rules",
);
assertClean(
  await createLintResult(
    "common",
    "src/config-check.ts",
    "process.exitCode = process.env.NODE_ENV === 'test' ? 0 : 1\n",
  ),
  "common Node environment",
);
assertClean(
  await createLintResult(
    "web",
    "src/config-check.ts",
    "window.addEventListener('load', () => {})\n",
  ),
  "web browser environment",
);
assertClean(
  await createLintResult(
    "web",
    "vite.config.ts",
    "process.exitCode = process.env.CI ? 0 : 1\n",
  ),
  "web tool Node environment",
);
assertClean(
  await createLintResult(
    "e2eFixtures",
    "src/config-check.ts",
    "process.exitCode = process.env.NODE_ENV === 'test' ? 0 : 1\n",
  ),
  "e2e fixtures Node environment",
);
assertClean(
  await createLintResult(
    "migrator",
    "src/config-check.ts",
    "process.exitCode = process.env.NODE_ENV === 'test' ? 0 : 1\n",
  ),
  "MongoDB migrator Node environment",
);
assertRule(
  await createLintResult(
    "web",
    "src/config-check.tsx",
    "function Component() {\n  if (true) useState()\n  return <div />\n}\n",
  ),
  "react-hooks/rules-of-hooks",
  "React Hooks rules",
);
assertRule(
  await createLintResult(
    "service",
    "src/config-check.ts",
    "process.exitCode = 1 as any\n",
  ),
  "@typescript-eslint/no-explicit-any",
  "service shared TypeScript rules",
);
assertClean(
  await createLintResult(
    "service",
    "src/config-check.spec.ts",
    "process.exitCode = 1 as any\n",
  ),
  "service test override",
);

console.log("ESLint configuration checks passed.");
