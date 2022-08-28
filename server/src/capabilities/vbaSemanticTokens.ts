import {InitializeResult} from 'vscode-languageserver';

const tokenTypes = ['class', 'interface', 'enum', 'function', 'variable'];
const tokenModifiers = ['declaration', 'documentation'];

export function activateSemanticTokenProvider(result: InitializeResult) {
	result.capabilities.semanticTokensProvider = {
		legend: {
			tokenTypes: tokenTypes,
			tokenModifiers: tokenModifiers
		}
	};
}