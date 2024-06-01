import {InitializeResult, Range, SemanticTokenModifiers, SemanticTokenTypes, uinteger, _LanguagesImpl, SemanticTokens, SemanticTokensParams, SemanticTokensRangeParams} from 'vscode-languageserver';
import { HasSemanticToken } from '../project/elements/base';

const registeredTokenTypes = new Map<string, number>((Object.keys(SemanticTokenTypes) as (keyof typeof SemanticTokenTypes)[]).map((k, i) => ([k, i])));
const registeredTokenModifiers = new Map<string, number>((Object.keys(SemanticTokenModifiers) as (keyof typeof SemanticTokenModifiers)[]).map((k, i) => ([k, 2**i])));

export function activateSemanticTokenProvider(result: InitializeResult) {
	result.capabilities.semanticTokensProvider = {
		"full": true,
		legend: {
			tokenTypes: Array.from(registeredTokenTypes.keys()),
			tokenModifiers: Array.from(registeredTokenModifiers.keys()),
		}
	};
}

export function sortSemanticTokens(tokens: SemanticToken[]): SemanticToken[] {
	return tokens.sort((a, b) => {
		// Sort a before than b.
        if ((a.line < b.line) || (a.line === b.line && a.char < b.char))
            return -1;
		// Sort b before a.
        if ((a.line > b.line) || (a.line === b.line && a.char > b.char))
            return 1;
		// No difference.
        return 0;
    });
}

export class SemanticToken {
	line: uinteger;
	char: uinteger;
	length: uinteger;
	tokenType: uinteger;
	tokenModifiers: uinteger = 0;
	element: HasSemanticToken;

	constructor(element: HasSemanticToken, line: uinteger, startChar: uinteger, length: uinteger, tokenType: SemanticTokenTypes, tokenModifiers: SemanticTokenModifiers[]) {
		this.element = element;
		this.line = line;
		this.char = startChar;
		this.length = length;
		this.tokenType = registeredTokenTypes.get(tokenType)!;
		tokenModifiers.forEach((x) => this.tokenModifiers += registeredTokenModifiers.get(x) ?? 0);
	}	

	static create(element: HasSemanticToken): SemanticToken {
		return new SemanticToken(
			element,
			element.identifier.range.start.line,
			element.identifier.range.start.character,
			element.identifier.context.getText().length,
			element.tokenType,
			element.tokenModifiers
		);
	}

	toNewRange(range: Range): SemanticToken {
		const token = new SemanticToken(
			this.element,
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
		const deltaChar = deltaLine === 0 ? this.char - startChar : this.char;
		return [deltaLine, deltaChar, this.length, this.tokenType, this.tokenModifiers];
	}

	toSemanticTokensArray(reference?: SemanticToken): uinteger[] {
		const line = this.line - (reference?.line ?? 0);
		const char = line === 0 ? this.char - reference!.char : this.char;
		return [
			line,
			char,
			this.length,
			this.tokenType,
			this.tokenModifiers
		];
	}
}


/**
 * Tracks, sorts, and provides LSP response for SemanticTokens.
 */
export class SemanticTokensManager {
	private _tokens: SemanticToken[] = [];

	private _tokensInRange = (range: Range) =>
		this._tokens.filter(token => token.element.isChildOf(range));

	add(element: HasSemanticToken) {
		this._tokens.push(SemanticToken.create(element));
	}

	// getSemanticTokens(params: SemanticTokensParams): SemanticTokens | null;
	// getSemanticTokens(rangeParams: SemanticTokensRangeParams): SemanticTokens | null;
	// getSemanticTokens(_?: SemanticTokensParams, rangeParams?: SemanticTokensRangeParams): SemanticTokens | null {
	getSemanticTokens(range?: Range): SemanticTokens | null {
		// Get the range if we have one.
		// const range: Range | undefined = rangeParams?.range;

		// Filter and sort the semantic tokens.
		const filteredTokens = range ? this._tokensInRange(range) : this._tokens;
		const sortedTokens = sortSemanticTokens(filteredTokens);
		if (sortedTokens.length === 0)
			return null;
		
		// Get an array of SemanticTokens relative to previous token.
		const packedData: uinteger[][] = sortedTokens.map((token, i) =>
			token.toSemanticTokensArray(i === 0 ? undefined : sortedTokens[i - 1]));

		// Return the flattened array.
		return { data: ([] as uinteger[]).concat(...packedData) };
	}
}
