// @ts-check
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  // ──────────────────────────────────────────────
  //  Ignore patterns
  // ──────────────────────────────────────────────
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      '.turbo/',
      '.nx/',
      'android/',
      'ios/',
      '*.log',
      'apps/car-manager/capacitor.config.ts',
      'apps/car-manager/scripts/',
      '*.spec.backup.ts',
    ],
  },

  // ──────────────────────────────────────────────
  //  TypeScript files — ścisłe reguły (strict + stylistic)
  // ──────────────────────────────────────────────
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      // ── Prettier ──
      'prettier/prettier': ['error', {}, { usePrettierrc: true }],

      // ── TypeScript: pragmatycznie ścisłe ──
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/member-ordering': 'warn',

      // ── Unsafe — wyłączone bo projekt używa Firebase, dynamicznych API ──
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // ── Złagodzone dla Angular / Firebase ──
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unnecessary-type-conversion': 'warn',
      '@typescript-eslint/non-nullable-type-assertion-style': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',

      // ── General ──
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // ──────────────────────────────────────────────
  //  Angular TypeScript rules
  // ──────────────────────────────────────────────
  {
    files: ['**/*.ts'],
    plugins: {
      '@angular-eslint': angular,
    },
    rules: {
      '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Page', 'Component'] }],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: ['element', 'attribute'],
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'warn',
      '@angular-eslint/prefer-host-metadata-property': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-rename': 'error',
      '@angular-eslint/relative-url-prefix': 'error',
      '@angular-eslint/use-component-selector': 'warn',
      '@angular-eslint/no-output-on-prefix': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/sort-lifecycle-methods': 'warn',
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
      '@angular-eslint/no-inputs-metadata-property': 'error',
      '@angular-eslint/no-outputs-metadata-property': 'error',
      '@angular-eslint/no-queries-metadata-property': 'error',
    },
  },

  // ──────────────────────────────────────────────
  //  Angular templates — pliki .html
  // ──────────────────────────────────────────────
  {
    files: ['**/*.html'],
    plugins: {
      '@angular-eslint/template': angularTemplate,
    },
    languageOptions: {
      parser: angularTemplateParser,
    },
    rules: {
      '@angular-eslint/template/banana-in-box': 'error',
      '@angular-eslint/template/no-negated-async': 'error',
      '@angular-eslint/template/conditional-complexity': ['warn', { maxComplexity: 6 }],
      '@angular-eslint/template/cyclomatic-complexity': ['warn', { maxComplexity: 10 }],
      '@angular-eslint/template/alt-text': 'error',
      '@angular-eslint/template/elements-content': 'error',
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/table-scope': 'error',
      '@angular-eslint/template/valid-aria': 'error',
      '@angular-eslint/template/button-has-type': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/mouse-events-have-key-events': 'error',
      '@angular-eslint/template/no-autofocus': 'error',
      '@angular-eslint/template/no-positive-tabindex': 'error',
      '@angular-eslint/template/role-has-required-aria': 'error',
      '@angular-eslint/template/attributes-order': 'warn',

      // ── Accessibility — dodatkowe reguły ──
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/role-has-required-aria': 'error',
      '@angular-eslint/template/table-scope': 'error',
    },
  },

  // ──────────────────────────────────────────────
  //  Test files — poluzowane
  // ──────────────────────────────────────────────
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@angular-eslint/component-class-suffix': 'off',
      '@angular-eslint/use-component-selector': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      'no-console': 'off',
      'prettier/prettier': ['error', {}, { usePrettierrc: true }],
    },
  },

  // ──────────────────────────────────────────────
  //  Environment config files — poluzowane
  // ──────────────────────────────────────────────
  {
    files: ['**/environments/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
    },
  },

  // ──────────────────────────────────────────────
  //  Prettier — na końcu, wyłącza reguły kolidujące z Prettierem
  // ──────────────────────────────────────────────
  {
    rules: prettierConfig.rules,
  },
);
