// // eslint.config.js
// import js from '@eslint/js';
// import ts from '@typescript-eslint/eslint-plugin';
// import parser from '@typescript-eslint/parser';

// export default [
//   js.configs.recommended,
//   {
//     files: ['**/*.ts', '**/*.tsx'],
//     languageOptions: {
//       parser,
//     },
//     plugins: {
//       '@typescript-eslint': ts,
//     },
//     rules: {
//       semi: ['error', 'always'],
//       '@typescript-eslint/no-unused-vars': 'off',
//       '@typescript-eslint/no-explicit-any': 'off',
//       '@typescript-eslint/explicit-module-boundary-types': 'off',
//       '@typescript-eslint/no-non-null-assertion': 'off',
//     },
//   },
// ];

// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import parser from '@typescript-eslint/parser';

export default [
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: {
			semi: ['error', 'always'],
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
		},
	},
	{
		ignores: [
			'node_modules/',
			'client/node_modules/',
			'client/out/',
			'server/node_modules/',
			'server/out/',
			'server/src/antlr/',
		],
	},
];