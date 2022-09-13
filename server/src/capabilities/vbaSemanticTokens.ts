import {InitializeResult, Range, SemanticTokenModifiers, SemanticTokenTypes, uinteger, _LanguagesImpl} from 'vscode-languageserver';

const tokenTypes = new Map<string, number>((Object.keys(SemanticTokenTypes) as (keyof typeof SemanticTokenTypes)[]).map((k, i) => ([k, i])));
const tokenModifiers = new Map<string, number>((Object.keys(SemanticTokenModifiers) as (keyof typeof SemanticTokenModifiers)[]).map((k, i) => ([k, 2**i])));

export function activateSemanticTokenProvider(result: InitializeResult) {
	result.capabilities.semanticTokensProvider = {
		"full": true,
		legend: {
			tokenTypes: Array.from(tokenTypes.keys()),
			tokenModifiers: Array.from(tokenModifiers.keys()),
		}
	};
}

export function sortSemanticTokens(toks: SemanticToken[]): SemanticToken[] {
	return toks.sort((a, b) => {
		// Sort a before than b.
        if ((a.line < b.line) || (a.line === b.line && a.startChar < b.startChar))
            return -1;
		// Sort b before a.
        if ((a.line > b.line) || (a.line === b.line && a.startChar > b.startChar))
            return 1;
		// No difference.
        return 0;
    });
}

export class SemanticToken {
	line: uinteger;
	startChar: uinteger;
	length: uinteger;
	tokenType: uinteger;
	tokenModifiers: uinteger = 0;

	constructor(line: uinteger, startChar: uinteger, length: uinteger, tokenType: SemanticTokenTypes, tokenModifier: SemanticTokenModifiers[]) {
		this.line = line;
		this.startChar = startChar;
		this.length = length;
		this.tokenType = tokenTypes.get(tokenType)!;
		tokenModifier.forEach((x) => this.tokenModifiers += tokenModifiers.get(x) ?? 0);
	}

	toNewRange(range: Range): SemanticToken {
		const token = new SemanticToken(
			range.start.line,
			range.start.character,
			this.length,
			SemanticTokenTypes.class,
			[]
		);
		token.tokenType = this.tokenType;
		token.tokenModifiers = this.tokenModifiers;
		return token;
	}

	toDeltaToken(line: uinteger = 0, startChar: uinteger = 0): uinteger[] {
		const deltaLine = this.line - line;
		const deltaChar = deltaLine === 0 ? this.startChar - startChar : this.startChar;
		return [deltaLine, deltaChar, this.length, this.tokenType, this.tokenModifiers];
	}
}
