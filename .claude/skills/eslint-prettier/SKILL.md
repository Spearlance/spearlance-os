---
model: claude-sonnet-4-6
name: eslint-prettier
description: Use when setting up code linting and formatting with ESLint and Prettier — configuration, rule customization, IDE integration, or CI enforcement. Also use when migrating ESLint to flat config or resolving ESLint/Prettier conflicts.
---

# ESLint + Prettier

## Overview
ESLint 9 (current) uses flat config (`eslint.config.js`) by default. Prettier 3.x handles formatting. They integrate via `eslint-config-prettier` (disables conflicting rules) + optional `eslint-plugin-prettier` (runs Prettier as an ESLint rule).

## Quick Reference

| Item | Value |
|------|-------|
| **ESLint** | v9.x (flat config default) |
| **Prettier** | v3.x (latest: 3.8.x) |
| **Config file** | `eslint.config.js` (or `.mjs`) |
| **Prettier config** | `.prettierrc` or `prettier.config.js` |
| **Run lint** | `npx eslint .` |
| **Run format** | `npx prettier --write .` |

## Flat Config Structure

```js
// eslint.config.js
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig(
  js.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.{js,ts}'],
    rules: { 'no-console': 'warn' },
  },
  { ignores: ['dist/', 'node_modules/'] }
);
```

## Prettier Config

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

## Integration Approach

**Preferred:** `eslint-config-prettier` only — ESLint for logic, Prettier CLI for formatting.

```bash
npm install -D eslint prettier eslint-config-prettier
```

**Alternative:** `eslint-plugin-prettier` — runs Prettier as an ESLint rule (slower, shows format errors as lint errors).

## package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `.eslintrc` | Migrate to `eslint.config.js` — ESLint 9 defaults to flat config, v10 removes legacy |
| Prettier rules fighting ESLint | Add `eslint-config-prettier` last in config array |
| No `ignores` in flat config | Replace `.eslintignore` with `ignores` array in `eslint.config.js` |
| `plugin:` syntax in flat config | Flat config uses `import` + object spread — no `extends: []` array |
| Formatting on save not working | Check VS Code settings: `editor.formatOnSave` + default formatter set to Prettier |

## Full Reference

See `reference.md` for complete documentation: TypeScript setup, React/Next.js config, import ordering, custom rules, IDE integration, CI enforcement, and migration guide.
