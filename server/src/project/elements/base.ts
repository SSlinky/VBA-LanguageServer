import { ParserRuleContext } from 'antlr4ts';
import { getCtxRange } from '../../utils/helpers';
import { SemanticTokenModifiers, SemanticTokenTypes, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { Position, Range, TextDocument } from 'vscode-languageserver-textdocument';
import { FoldingRangeKind } from '../../capabilities/folding';
import { IdentifierElement } from './memory';
import { AttributeStmtContext } from '../../antlr/out/vbaParser';

export interface ContextOptionalSyntaxElement {
	range?: Range;
	parent?: ContextOptionalSyntaxElement;
	context?: ParserRuleContext;
	get text(): string;
	get uri(): string;

	isChildOf(range: Range): boolean;
}

interface SyntaxElement extends ContextOptionalSyntaxElement {
	range: Range;
	context: ParserRuleContext;
}

export interface HasAttribute {
	processAttribute(context: AttributeStmtContext): void;
}

export interface NamedSyntaxElement extends SyntaxElement {
	get name(): string;
}

export interface IdentifiableSyntaxElement extends NamedSyntaxElement {
	identifier: IdentifierElement;
}

export interface HasSymbolInformation extends NamedSyntaxElement {
	symbolInformation: SymbolInformation;
}

export interface HasSemanticToken extends NamedSyntaxElement, IdentifiableSyntaxElement {
	tokenType: SemanticTokenTypes;
	tokenModifiers: SemanticTokenModifiers[];
}

export interface MemoryElement extends BaseSyntaxElement {
	name: string;
	returnType: any;
	symbol: SymbolKind;
}

export interface FoldingRangeElement {
	range: Range;
	foldingRangeKind?: FoldingRangeKind;
}

export abstract class BaseSyntaxElement implements ContextOptionalSyntaxElement {
	protected document: TextDocument;
	
	range?: Range;
	parent?: ContextOptionalSyntaxElement;
	context?: ParserRuleContext;

	get text(): string { return this.context?.text ?? ''; }
	get uri(): string { return this.document.uri; }

	constructor(context: ParserRuleContext | undefined, document: TextDocument) {
		this.context = context;
		this.document = document;
		this.range = context ? getCtxRange(context, document) : undefined;
	}

	isChildOf = (range: Range): boolean => {
		if (!this.range) {
			return false;
		}

		const isPositionBefore = (x: Position, y: Position) =>
			x.line < y.line || (x.line === y.line && x.character <= y.character);

		return isPositionBefore(range.start, this.range.start)
			&& isPositionBefore(this.range.end, range.end);
	};
}

export abstract class BaseContextSyntaxElement extends BaseSyntaxElement {
	range!: Range;
	context!: ParserRuleContext;

	constructor(ctx: ParserRuleContext, doc: TextDocument) {
		super(ctx, doc);
	}
}