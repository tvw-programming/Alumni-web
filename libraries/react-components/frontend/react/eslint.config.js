import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { importX } from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import pluginQuery from '@tanstack/eslint-plugin-query';
import vitest from '@vitest/eslint-plugin';
import testingLibrary from 'eslint-plugin-testing-library';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '.husky/**', 'coverage/**'],
  },

  js.configs.recommended,

  // Type-aware linting. It costs a full type-check per run, which is what
  // makes rules like no-floating-promises and no-misused-promises possible —
  // the two that actually catch bugs in an async React/React Query codebase.
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  jsxA11y.flatConfigs.recommended,
  pluginQuery.configs['flat/recommended'],

  // Applies to every file type, including this config. TypeScript resolves
  // paths, `exports` maps and ambient modules better than the resolver does,
  // and reports the same problems itself. The default-export rules misfire
  // both on CommonJS interop (react, highcharts) and on the flat-config idiom
  // `tseslint.configs.*`, where the named and default exports coexist by
  // design.
  {
    rules: {
      'import-x/no-unresolved': 'off',
      'import-x/default': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },

  {
    files: ['**/*.{ts,tsx}'],

    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        // Resolves each file's tsconfig automatically instead of hard-coding
        // a project list that drifts out of sync.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },

    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: './tsconfig.json',
        }),
      ],
    },

    rules: {
      ...reactHooks.configs.recommended.rules,

      // Promoted out of the burn-down tier once the codebase reached zero.
      // These catch bugs that are invisible until they are not: a ref read
      // during render does not re-render when it changes, setState in an
      // effect body costs an extra render pass on every update, and
      // `String(someObject)` yields '[object Object]'. Route loosely-typed
      // values through `toDisplayString` (src/utils/format.ts) instead.
      'react-hooks/refs': 'error',
      'react-hooks/set-state-in-effect': 'error',
      '@typescript-eslint/no-base-to-string': 'error',

      // Vite's fast refresh only works when a module exports components and
      // nothing else. Warn rather than error: context files legitimately
      // export a provider plus its hook.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // `_`-prefixed names are the agreed way to say "intentionally unused".
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // A dropped promise in an event handler or effect fails silently, which
      // is the single most common source of "nothing happened" bugs here.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        // <form onSubmit={async …}> and friends are idiomatic; the void
        // return is handled by React, not by us.
        { checksVoidReturn: { attributes: false } },
      ],

      // `as` casts silently defeat every other rule in this file. Prefer
      // `satisfies`, a type guard, or a schema parse.
      '@typescript-eslint/consistent-type-assertions': [
        'warn',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],

      // Left at `error` from recommendedTypeChecked. AppError
      // (src/types/api.ts) is a plain discriminated union rather than an
      // Error subclass, so the two places that raise one carry an inline
      // exemption — the rules still guard every other throw and reject.
      // A rule-level `allow` cannot express this: the specifier matches named
      // types, and AppError's constituents are anonymous object types.

      // `import type` is required by verbatimModuleSyntax and keeps types out
      // of the emitted bundle.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Deterministic import order, so diffs show intent rather than churn.
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
          pathGroupsExcludedImportTypes: ['type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-duplicates': ['error', { 'prefer-inline': true }],

      // The login screen's username field carries the one reviewed exemption,
      // inline at the call site. Grid cell editors focus themselves through
      // `useAutoFocus` (src/hooks/useAutoFocus.ts) instead: the user opened
      // the editor, so moving focus there is expected — which is the case
      // this rule is not meant to catch.
      'jsx-a11y/no-autofocus': 'error',

      // Correctness rules that are not on by default.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-alert': 'error',
      'no-implicit-coercion': 'error',
      'no-param-reassign': [
        'error',
        {
          props: true,
          // Reduce accumulators and DOM/drag events are mutated by design.
          ignorePropertyModificationsFor: ['acc', 'accumulator', 'draft', 'e', 'event'],
        },
      ],
      'object-shorthand': ['error', 'always'],
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use src/utils/safeStorage.ts instead.' },
        { name: 'sessionStorage', message: 'Use src/utils/safeStorage.ts instead.' },
      ],

      /* ---------------------------------------------------------------- *
       * Burn-down tier.
       *
       * These are real findings, not false positives, but each needs a
       * typing or component refactor rather than a mechanical fix. They are
       * warnings so `pnpm lint` can gate CI today; `pnpm lint:strict` fails
       * on them, and the goal is to promote each one to `error` as the count
       * reaches zero. Run `pnpm lint` for the current list.
       * ---------------------------------------------------------------- */

      // ~140 findings, all rooted in `any` at the API/form/grid boundaries.
      // Type those boundaries and the whole family clears at once.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      // Reports `||` on `any` operands, so it clears with the family above.
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    },
  },

  // Tests. `testing-library` catches the mistakes that make a test pass while
  // asserting nothing — a missing `await` on findBy*, a container.querySelector
  // that bypasses the accessibility tree, an unwrapped state update.
  {
    files: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    extends: [vitest.configs.recommended, testingLibrary.configs['flat/react']],
    rules: {
      // A test that asserts nothing is worse than no test.
      'vitest/expect-expect': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-identical-title': 'error',
      'vitest/valid-expect': 'error',

      // Tests exercise the prop deliberately, including `autoFocus={false}`,
      // which the rule flags regardless of the value.
      'jsx-a11y/no-autofocus': 'off',

      // Fixtures are deliberately partial — building a whole FieldConfigV2 to
      // assert on one prop would obscure what the test is about.
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // Shared test bootstrap, not a test itself.
  {
    files: ['src/test/**/*.{ts,tsx}'],
    rules: {
      // The rule assumes `globals: true`, where Testing Library installs its
      // own afterEach. This project sets `globals: false`, so the cleanup in
      // src/test/setup.ts is load-bearing.
      'testing-library/no-manual-cleanup': 'off',
    },
  },

  // Config and tooling files run in Node. tsconfig.json covers `src` only, so
  // point them at the Node project that actually includes them.
  {
    files: ['*.config.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: false,
        project: './tsconfig.node.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'import-x/no-default-export': 'off',
      'no-console': 'off',
    },
  },

  // Plain JS (this file) and the Node build scripts have no type information to
  // lint against — they are outside every tsconfig, so a typed rule reaching for
  // a program crashes the run rather than reporting anything.
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },

  // Must stay last: turns off every rule that would fight Prettier.
  prettier,
);
