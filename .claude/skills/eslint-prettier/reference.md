# ESLint + Prettier Developer Reference

> **Last Updated:** February 2026
> **ESLint:** 9.x (flat config default; v10 removes legacy eslintrc)
> **Prettier:** 3.8.x
> **Documentation:** https://eslint.org/docs/latest | https://prettier.io/docs

---

## Table of Contents

1. [ESLint 9 Flat Config](#eslint-9-flat-config)
2. [Prettier Setup](#prettier-setup)
3. [Integration](#integration)
4. [TypeScript](#typescript)
5. [React and Next.js](#react-and-nextjs)
6. [Import Ordering](#import-ordering)
7. [Custom Rules](#custom-rules)
8. [IDE Integration](#ide-integration)
9. [CI Enforcement](#ci-enforcement)
10. [Migration from .eslintrc](#migration-from-eslintrc)
11. [Common Mistakes](#common-mistakes)

---

## ESLint 9 Flat Config

### Overview

ESLint 9 defaults to `eslint.config.js` (flat config). The legacy `.eslintrc*` format is deprecated in v9 and removed in v10. Flat config uses ES module imports, has no `extends` string array, and replaces `.eslintignore` with an `ignores` property.

### Install

```bash
npm install -D eslint @eslint/js
```

### Minimal Config

```js
// eslint.config.js
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '.next/', 'coverage/'],
  },
];
```

### With defineConfig Helper (ESLint 9.3+)

`defineConfig` auto-flattens arrays and provides type inference. No spread operator needed.

```js
// eslint.config.js
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.ts'],
    rules: {
      'no-unused-vars': 'warn',
    },
  },
  {
    ignores: ['dist/', 'node_modules/'],
  }
);
```

### Config Object Shape

Each object in the flat config array accepts:

```js
{
  // Which files this config applies to
  files: ['**/*.ts', '**/*.tsx'],

  // Which files to skip (top-level object = global ignore)
  ignores: ['dist/'],

  // Language options (replaces parserOptions + env)
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.json',
    },
    globals: {
      window: 'readonly',
      process: 'readonly',
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },

  // Plugins (object map, not array of strings)
  plugins: {
    '@typescript-eslint': tsPlugin,
    react: reactPlugin,
  },

  // Rules
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
  },

  // Settings passed to all rules in this config object
  settings: {
    react: { version: 'detect' },
  },
}
```

### Global Ignores

A config object with only `ignores` and no `files` applies globally:

```js
export default defineConfig(
  // ... other configs
  {
    ignores: [
      'dist/',
      'build/',
      '.next/',
      'coverage/',
      '*.config.js',
      'public/',
    ],
  }
);
```

---

## Prettier Setup

### Install

```bash
npm install -D prettier
```

### .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "jsxSingleQuote": false,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### prettier.config.js (Alternative)

```js
// prettier.config.js
/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  plugins: ['prettier-plugin-tailwindcss'],
};
```

### .prettierignore

```
node_modules/
dist/
build/
.next/
coverage/
*.min.js
public/
```

### Scripts

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### Key Options Reference

| Option | Default | Common Override |
|--------|---------|-----------------|
| `semi` | `true` | `false` (no semicolons) |
| `singleQuote` | `false` | `true` |
| `tabWidth` | `2` | `4` |
| `trailingComma` | `"all"` (v3) | `"es5"` |
| `printWidth` | `80` | `100` or `120` |
| `bracketSameLine` | `false` | `true` (JSX closing bracket on same line) |
| `arrowParens` | `"always"` | `"avoid"` (omit parens for single-arg arrows) |

---

## Integration

### Strategy 1: eslint-config-prettier Only (Recommended)

ESLint handles code quality. Prettier CLI handles formatting. No overlap.

```bash
npm install -D eslint-config-prettier
```

```js
// eslint.config.js
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig(
  js.configs.recommended,
  // ... other configs
  prettierConfig  // must be last — disables conflicting ESLint formatting rules
);
```

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check": "npm run lint && npm run format:check"
  }
}
```

### Strategy 2: eslint-plugin-prettier (Formatting as Lint Errors)

Prettier violations appear as ESLint errors. Slower — runs Prettier on every lint pass.

```bash
npm install -D eslint-plugin-prettier eslint-config-prettier
```

```js
// eslint.config.js
import prettierPlugin from 'eslint-plugin-prettier/recommended';

export default defineConfig(
  js.configs.recommended,
  // ... other configs
  prettierPlugin  // includes eslint-config-prettier + prettier rule
);
```

The `eslint-plugin-prettier/recommended` config does three things:
1. Enables `eslint-plugin-prettier`
2. Sets `prettier/prettier` rule to `"error"`
3. Applies `eslint-config-prettier` to disable conflicting rules

**When to use Strategy 2:** Teams that want formatting enforced by `eslint --fix` only, without a separate `prettier` command.

**When to use Strategy 1:** Faster CI, clearer separation of concerns, recommended for most projects.

---

## TypeScript

### Install

```bash
npm install -D typescript-eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### Basic TypeScript Config

```js
// eslint.config.js
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  }
);
```

### Type-Aware Rules

Type-aware rules require `project` in `parserOptions`. They're slower but catch real bugs.

```js
{
  files: ['**/*.ts', '**/*.tsx'],
  languageOptions: {
    parserOptions: {
      project: true,          // auto-finds tsconfig.json
      tsconfigRootDir: import.meta.dirname,
    },
  },
  // Use type-aware preset
  ...tseslint.configs.recommendedTypeChecked,
}
```

Useful type-aware rules:

```js
rules: {
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
  '@typescript-eslint/prefer-nullish-coalescing': 'warn',
  '@typescript-eslint/prefer-optional-chain': 'warn',
}
```

### tsconfig.json Compatibility

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

Set `@typescript-eslint/no-unused-vars` to `off` when TypeScript's `noUnusedLocals` is enabled — avoid double-reporting.

---

## React and Next.js

### Install

```bash
npm install -D eslint-plugin-react eslint-plugin-react-hooks
# For JSX accessibility
npm install -D eslint-plugin-jsx-a11y
```

### React Config

```js
// eslint.config.js
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',  // not needed in React 17+
      'react/prop-types': 'off',          // TypeScript handles this
    },
  },
  prettierConfig
);
```

### Next.js Config

Next.js ships `eslint-config-next` which bundles React, React Hooks, import, and a11y rules.

```bash
npm install -D eslint-config-next
```

```js
// eslint.config.js
import { defineConfig } from 'eslint/config';
import { FlatCompat } from '@eslint/eslintrc';
import prettierConfig from 'eslint-config-prettier';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default defineConfig(
  ...compat.extends('next/core-web-vitals'),
  prettierConfig,
  {
    rules: {
      // project-specific overrides
    },
  }
);
```

`FlatCompat` bridges legacy `extends` strings into flat config format. Required for `eslint-config-next` until it ships native flat config support.

---

## Import Ordering

### Install

```bash
npm install -D eslint-plugin-import
# or the faster alternative:
npm install -D eslint-plugin-simple-import-sort
```

### eslint-plugin-simple-import-sort (Recommended)

Fewer options, auto-fixable, works with `--fix`.

```js
import simpleImportSort from 'eslint-plugin-simple-import-sort';

// in config object:
{
  plugins: { 'simple-import-sort': simpleImportSort },
  rules: {
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
  },
}
```

Output order: external packages → internal aliases → relative imports → side-effect imports.

### eslint-plugin-import (More Control)

```js
import importPlugin from 'eslint-plugin-import';

{
  plugins: { import: importPlugin },
  rules: {
    'import/order': ['error', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
    }],
    'import/no-duplicates': 'error',
    'import/no-unused-modules': 'warn',
  },
}
```

---

## Custom Rules

### Inline Rule (No Plugin)

For project-specific patterns, use ESLint's built-in `no-restricted-syntax` or `no-restricted-imports`:

```js
{
  rules: {
    // Block console.log in production code but allow in tests
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name="console"][callee.property.name!=/^(warn|error)$/]',
        message: 'Use logger instead of console.log',
      },
    ],
    // Block specific imports
    'no-restricted-imports': ['error', {
      patterns: ['lodash/*', '../../*'],
      paths: [{ name: 'lodash', message: 'Use lodash-es for tree-shaking' }],
    }],
  },
}
```

### Local Plugin

For reusable custom rules within a monorepo:

```js
// eslint-local-rules.js
export default {
  'no-barrel-imports': {
    meta: { type: 'suggestion', fixable: 'code' },
    create(context) {
      return {
        ImportDeclaration(node) {
          if (node.source.value.endsWith('/index')) {
            context.report({ node, message: 'Avoid barrel imports' });
          }
        },
      };
    },
  },
};
```

```js
// eslint.config.js
import localRules from './eslint-local-rules.js';

{
  plugins: { local: { rules: localRules } },
  rules: { 'local/no-barrel-imports': 'warn' },
}
```

---

## IDE Integration

### VS Code

Install the ESLint and Prettier extensions:
- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`

`.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": ["javascript", "typescript", "javascriptreact", "typescriptreact"],
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[json]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
```

`.vscode/extensions.json` (recommended extensions prompt):

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

### JetBrains (WebStorm / IntelliJ)

1. **Prettier:** Settings > Languages & Frameworks > Prettier → enable "On save", set `prettier` binary to `node_modules/.bin/prettier`
2. **ESLint:** Settings > Languages & Frameworks > JavaScript > ESLint → enable "Automatic ESLint configuration"

### Neovim (null-ls / conform.nvim)

```lua
-- conform.nvim for formatting
require("conform").setup({
  formatters_by_ft = {
    javascript = { "prettier" },
    typescript = { "prettier" },
    typescriptreact = { "prettier" },
  },
  format_on_save = { timeout_ms = 500, lsp_fallback = true },
})
```

---

## CI Enforcement

### GitHub Actions

```yaml
# .github/workflows/lint.yml
name: Lint & Format

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
```

### Pre-commit Hooks with lint-staged

```bash
npm install -D husky lint-staged
npx husky init
```

`.husky/pre-commit`:

```bash
npx lint-staged
```

`package.json`:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css,html}": ["prettier --write"]
  }
}
```

### Fail Fast on CI

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "format:check": "prettier --check ."
  }
}
```

`--max-warnings 0` treats warnings as errors — CI fails on any lint warning. Remove for local dev if too noisy.

---

## Migration from .eslintrc

### Key Changes

| Legacy (.eslintrc) | Flat Config (eslint.config.js) |
|-------------------|-------------------------------|
| `extends: ['plugin:@typescript-eslint/recommended']` | `...tseslint.configs.recommended` |
| `plugins: ['react']` | `plugins: { react: reactPlugin }` |
| `env: { browser: true }` | `languageOptions: { globals: globals.browser }` |
| `.eslintignore` | `ignores` in config array |
| `parserOptions.ecmaVersion` | `languageOptions.ecmaVersion` |
| `overrides: [{ files, rules }]` | Separate config objects with `files` |

### FlatCompat for Legacy Plugins

Some plugins haven't shipped native flat config support. Use `FlatCompat` as a bridge:

```bash
npm install -D @eslint/eslintrc
```

```js
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default defineConfig(
  ...compat.extends('plugin:some-legacy-plugin/recommended'),
  // ... rest of config
);
```

### Migration Script

ESLint ships an official migration script:

```bash
npx @eslint/migrate-config .eslintrc.json
```

This auto-converts `.eslintrc.*` to `eslint.config.js`. Review the output — it wraps legacy configs in `FlatCompat` where needed and converts direct rules.

### Verify Migration

```bash
# Check for remaining .eslintrc files
ls .eslintrc* 2>/dev/null

# Verify flat config is detected
npx eslint --print-config src/index.ts
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `extends: []` in flat config | No `extends` in flat config. Use spread: `...tseslint.configs.recommended` |
| `eslint-config-prettier` not last | It must come last to override all formatting rules |
| Prettier and ESLint fighting on save | Install `eslint-config-prettier` — it disables the conflicting rules |
| `.eslintignore` file ignored in v9 | Move patterns into `ignores` array in `eslint.config.js` |
| `plugin:` prefix in flat config | Import plugin directly: `import react from 'eslint-plugin-react'` |
| `env` key in flat config | Use `languageOptions.globals` with the `globals` package |
| `parserOptions` at top level | Nest inside `languageOptions.parserOptions` |
| Type-aware rules without `project` | Add `parserOptions: { project: true }` — otherwise rules silently no-op |
| `tseslint.configs.recommended` not spread | It returns an array — use `...tseslint.configs.recommended` |
| `format:check` not in CI | Prettier violations won't fail PR builds without `prettier --check` in CI |
| Running `eslint --fix` in CI | CI should only check, never auto-fix — `--fix` is for local dev only |
| Linting `node_modules` | Always include `ignores: ['node_modules/']` — flat config doesn't auto-ignore it in all cases |
| Using `eslint-plugin-prettier` for speed | It re-runs Prettier on every lint pass — use `eslint-config-prettier` + separate Prettier CLI instead |
| `arrow-body-style` conflicts | Disable it when using `eslint-plugin-prettier` — it conflicts with Prettier's arrow formatting |

---

## Package Summary

| Package | Purpose | Required |
|---------|---------|----------|
| `eslint` | Core linter | Yes |
| `@eslint/js` | `js.configs.recommended` | Yes |
| `prettier` | Formatter | Yes |
| `eslint-config-prettier` | Disable conflicting rules | Yes |
| `typescript-eslint` | TS parser + rules | TypeScript projects |
| `eslint-plugin-react` | React rules | React projects |
| `eslint-plugin-react-hooks` | Hooks rules | React projects |
| `eslint-plugin-jsx-a11y` | JSX accessibility | React projects |
| `eslint-plugin-simple-import-sort` | Import ordering | Optional |
| `eslint-plugin-prettier` | Prettier as lint rule | Only if desired |
| `@eslint/eslintrc` | FlatCompat for legacy plugins | Migration only |
