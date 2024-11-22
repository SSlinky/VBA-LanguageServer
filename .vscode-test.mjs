// .vscode-test.mjs
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'client/out/test/**/*.test.js',
	mocha: {
		ui: 'tdd',
		timeout: 4000
	}
});
