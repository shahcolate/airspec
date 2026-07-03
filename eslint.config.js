/**
 * ESLint flat config: typescript-eslint recommended rules over src and test.
 */
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'examples/**', '.airspec/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // The score report and analyzer details are intentionally loose bags of
      // data (Record<string, unknown>), so unused-vars is the main signal we
      // want; keep underscore-prefixed args as the conventional escape hatch.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  }
);
