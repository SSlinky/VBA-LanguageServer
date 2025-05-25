// Core
import {
	InitializeResult,
	Range,
	uinteger,
	SemanticTokens
} from 'vscode-languageserver';

// Antlr
import { ParserRuleContext } from 'antlr4ng/dist/ParserRuleContext';

// Project
import { BaseRuleSyntaxElement, HasSemanticTokenCapability } from '../project/elements/base';

export enum SemanticTokenTypes {
	namespace = "namespace",
	type = "type",
	class = "class",
	enum = "enum",
	interface = "interface",
	struct = "struct",
	typeParameter = "typeParameter",
	parameter = "parameter",
	variable = "variable",
	property = "property",
	enumMember = "enumMember",
	event = "event",
	function = "function",
	method = "method",
	macro = "macro",
	keyword = "keyword",
	modifier = "modifier",
	comment = "comment",
	string = "string",
	number = "number",
	regexp = "regexp",
	operator = "operator",
	decorator = "decorator"
}

export enum SemanticTokenModifiers {
	declaration = "declaration",
	definition = "definition",
	readonly = "readonly",
	static = "static",
	deprecated = "deprecated",
	abstract = "abstract",
	async = "async",
	modification = "modification",
	documentation = "documentation",
	defaultLibrary = "defaultLibrary"
}

const registeredTokenTypes = new Map<string, number>((Object.keys(SemanticTokenTypes) as (keyof typeof SemanticTokenTypes)[]).map((k, i) => ([k, i])));
const registeredTokenModifiers = new Map<string, number>((Object.keys(SemanticTokenModifiers) as (keyof typeof SemanticTokenModifiers)[]).map((k, i) => ([k, 2 ** i])));


export function activateSemanticTokenProvider(result: InitializeResult) {
	result.capabilities.semanticTokensProvider = {
		"full": true,
		legend: {
			tokenTypes: Array.from(registeredTokenTypes.keys()),
			tokenModifiers: Array.from(registeredTokenModifiers.keys()),
		}
	};
}


type SemanticElementType = HasSemanticTokenCapability
	& BaseRuleSyntaxElement<ParserRuleContext>;

export class SemanticToken {
	tokenType: uinteger;
	tokenModifiers: uinteger = 0;

	constructor(
		public element: SemanticElementType,
		public line: uinteger,
		public char: uinteger,
		public length: uinteger,
		tokenType: SemanticTokenTypes,
		tokenModifiers: SemanticTokenModifiers[]
	) {
		this.tokenType = registeredTokenTypes.get(tokenType)!;
		tokenModifiers.forEach((x) => this.tokenModifiers += registeredTokenModifiers.get(x) ?? 0);
	}

	toUintegerArray(reference?: SemanticToken): uinteger[] {
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
	private tokens: SemanticToken[] = [];

	private tokensInRange = (range: Range) =>
		this.tokens.filter(token => token.element.isChildOf(range));

	add(element: HasSemanticTokenCapability) {
		this.tokens.push(element.semanticTokenCapability.semanticToken);
	}

	getSemanticTokens(range?: Range): SemanticTokens | null {
		// Filter and sort the semantic tokens.
		const filteredTokens = range ? this.tokensInRange(range) : this.tokens;
		const sortedTokens = this.sortSemanticTokens(filteredTokens);
		if (sortedTokens.length === 0)
			return null;

		// Get an array of SemanticTokens relative to previous token.
		const relativeResult: uinteger[] = sortedTokens.map((token, i) =>
			token.toUintegerArray(i === 0 ? undefined : sortedTokens[i - 1])).flat();

		// Return the flattened array.
		return { data: relativeResult };
	}

	sortSemanticTokens(tokens: SemanticToken[]): SemanticToken[] {
		return tokens.sort((a, b) => {
			if ((a.line < b.line) || (a.line === b.line && a.char < b.char)) return -1;
			if ((a.line > b.line) || (a.line === b.line && a.char > b.char)) return 1;
			return 0;
		});
	}
}