import pluginJs from "@eslint/js";
import pluginImport from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

const sourceFiles = ["**/*.{js,mjs,cjs,ts,jsx,tsx}"];

const sharedRules = {
  "prettier/prettier": "error",
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/explicit-function-return-type": "off",
  "sort-imports": [
    "error",
    {
      ignoreCase: true,
      ignoreDeclarationSort: true,
    },
  ],
  "import/order": [
    "error",
    {
      groups: [
        "builtin",
        "external",
        "internal",
        "parent",
        "sibling",
        "index",
        "unknown",
      ],
      "newlines-between": "always",
      alphabetize: {
        order: "asc",
        caseInsensitive: true,
      },
    },
  ],
  "import/extensions": [
    "error",
    "ignorePackages",
    {
      ts: "never",
      tsx: "never",
    },
  ],
};

export const sharedConfig = [
  {
    ignores: ["**/node_modules/**", "**/dist/**"],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: sourceFiles,
    plugins: {
      prettier,
      import: pluginImport,
    },
    rules: sharedRules,
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
  },
];

export const nodeConfigFor = (files) => ({
  files,
  languageOptions: {
    globals: globals.node,
  },
});

export const nodeConfig = nodeConfigFor(sourceFiles);

export const browserConfig = {
  files: [
    "src/**/*.{js,mjs,cjs,ts,jsx,tsx}",
    "e2e-tests/**/*.{js,mjs,cjs,ts,jsx,tsx}",
  ],
  languageOptions: {
    globals: globals.browser,
  },
};

export default sharedConfig;
