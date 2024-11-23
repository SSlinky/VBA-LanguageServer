import { ParserRuleContext } from 'antlr4ng';
import { Diagnostic, Range, SemanticTokenModifiers, SemanticTokenTypes, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { Position, TextDocument } from 'vscode-languageserver-textdocument';
import { FoldingRangeKind } from '../../capabilities/folding';
import { IdentifierElement, PropertyDeclarationElement } from './memory';
import '../../extensions/parserExtensions';
import { IdentifiableScopeElement } from './special';
import { contextToRange } from '../../utils/helpers';

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

export interface HasDiagnosticCapability {
	diagnostics: Diagnostic[];
	evaluateDiagnostics(): Diagnostic[];
}

export interface NamedSyntaxElement extends SyntaxElement {
	get name(): string;
}

export interface IdentifiableSyntaxElement extends NamedSyntaxElement {
	identifier: IdentifierElement;
	isPropertyElement(): this is PropertyDeclarationElement
}

export interface HasSymbolInformation extends NamedSyntaxElement {
	get symbolInformation(): SymbolInformation;
}

export interface HasNamedSemanticToken extends NamedSyntaxElement, IdentifiableSyntaxElement {
	tokenType: SemanticTokenTypes;
	tokenModifiers: SemanticTokenModifiers[];
}

export interface HasSemanticToken extends SyntaxElement {
	range: Range;
	context: ParserRuleContext;
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

export interface DeclarationElement extends HasDiagnosticCapability, NamedSyntaxElement {
	isPublic: boolean;
	isPropertyElement(): this is PropertyDeclarationElement
}

export abstract class BaseSyntaxElement implements ContextOptionalSyntaxElement {
	protected document: TextDocument;
	
	range?: Range;
	parent?: ContextOptionalSyntaxElement;
	context?: ParserRuleContext;

	get text(): string { return this.context?.getText() ?? ''; }
	get uri(): string { return this.document.uri; }

	constructor(context: ParserRuleContext | undefined, document: TextDocument) {
		this.context = context;
		this.document = document;
		this.range = this._contextToRange();
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

	protected _contextToRange(): Range | undefined {
		return contextToRange(this.document, this.context);
	}
}

export abstract class BaseContextSyntaxElement extends BaseSyntaxElement {
	range!: Range;
	context!: ParserRuleContext;

	constructor(ctx: ParserRuleContext, doc: TextDocument) {
		super(ctx, doc);
	}
}

