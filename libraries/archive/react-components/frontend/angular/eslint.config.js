// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

/**
 * Lint configuration for the Angular app.
 *
 * Deliberately close to the React app's config where the two overlap — the
 * same `recommendedTypeChecked` + `stylisticTypeChecked` tiers, and the same
 * promoted rules — so a defect caught on one side is caught on the other. What differs is what the two
 * frameworks actually make possible to get wrong: React has hook rules, Angular
 * has template rules and lifecycle rules, and neither set means anything to the
 * other.
 */
export default tseslint.config(
  {
    // Build output and Node-only tooling. The reporter and the dev runner run
    // outside the browser and are not part of the app's type program.
    ignores: [
      'dist/**',
      'node_modules/**',
      '.angular/**',
      '.test-output/**',
      // Node-only tooling: the dev test runner and the Vitest reporter run
      // outside the browser and are excluded from the app's type program, so
      // the type-aware rules have nothing to resolve them against.
      'tools/**',
      'src/test/log-reporter.ts',
    ],
  },

  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      // Same tier as the React app, deliberately: `strictTypeChecked` fails on
      // this codebase's *intentional* runtime guards. Code that parses JSON,
      // reads localStorage or trusts a third-party response checks values the
      // compiler believes are already narrowed, and `no-unnecessary-condition`
      // cannot tell a redundant check from one defending a type assertion.
      // Deleting those checks to satisfy a linter would trade real safety for
      // a clean report.
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        // Resolves each file's tsconfig automatically rather than hard-coding
        // a project list that drifts out of sync.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],

      // This app is signals-only. These three are the decorators that would
      // quietly reintroduce the old input/output model alongside them.
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/prefer-standalone': 'error',

      // Unused vars are an error, but an underscore prefix is the standard way
      // to say "required by a signature, deliberately unused".
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Promoted out of the strict tier because each one caught a real defect
      // here, and the codebase is at zero for all of them.
      //   - no-base-to-string: `String(someObject)` yields '[object Object]',
      //     which is how a cache key silently collapses.
      //   - no-deprecated: found `withFetch`, removed in Angular 22.
      //   - no-unnecessary-type-assertion: an assertion that does nothing is
      //     usually a leftover from a type that has since changed.
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      // Numbers in template literals are unambiguous and universal; the rule
      // exists to catch objects and nullables, which stay errors.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],

      // Off, not misconfigured. The app throws `AppError` — a normalised plain
      // object rather than an `Error` subclass — because the shape is the
      // contract every consumer already runs through `normalizeError`, and it
      // is the same choice the React app makes. The rule has no option for
      // "a typed plain object", so it is either off or the codebase diverges.
      // The trade is real: a thrown object carries no stack. The error logger
      // records file and line at the capture point instead.
      '@typescript-eslint/only-throw-error': 'off',

      // Passing a bare function reference (`Validators.email`, `masterDataPath`)
      // is the point of a pure function. The rule guards against losing `this`,
      // which static and free functions do not have.
      '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
    },
  },

  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },

  {
    // Tests legitimately reach for non-null assertions and loose typing when
    // constructing fixtures; the production rules stay on everywhere else.
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);
