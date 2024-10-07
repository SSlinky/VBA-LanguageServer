import { ParserRuleContext } from 'antlr4ng';
import { FoldingRangeKind } from '../../capabilities/folding';
import { BaseContextSyntaxElement, DeclarationElement, FoldingRangeElement, IdentifiableSyntaxElement } from './base';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import { IdentifierElement, PropertyDeclarationElement } from './memory';
import { Diagnostic } from 'vscode-languageserver';


// TODO: Reorganise this stuff as properties of more generic classes.
// Whether the element is foldable or not is complicating inheritence.
export class FoldableElement extends BaseContextSyntaxElement implements FoldingRangeElement {
	range!: Range;
	foldingRangeKind?: FoldingRangeKind;
	
	constructor(ctx: ParserRuleContext, doc: TextDocument, foldingRangeKind?: FoldingRangeKind) {
		super(ctx, doc);
		this.foldingRangeKind = foldingRangeKind;
	}
}

export abstract class ScopeElement extends FoldableElement implements DeclarationElement {
	isPublic = false;
	diagnostics: Diagnostic[] = [];

	isPropertyElement(): this is PropertyDeclarationElement {
		return 'getDeclarations' in this;
	}

	constructor(ctx: ParserRuleContext, doc: TextDocument, foldingRangeKind?: FoldingRangeKind) {
		super(ctx, doc, foldingRangeKind);
	}

	abstract evaluateDiagnostics(): void;
	abstract get name(): string;
}

export abstract class IdentifiableScopeElement extends BaseContextSyntaxElement implements DeclarationElement, IdentifiableSyntaxElement {
	isPublic = false;
	diagnostics: Diagnostic[] = [];
	abstract identifier: IdentifierElement;

	constructor(ctx: ParserRuleContext, doc: TextDocument) {
		super(ctx, doc);
	}

	isPropertyElement(): this is PropertyDeclarationElement {
		return 'getDeclarations' in this;
	}
	abstract evaluateDiagnostics(): void;
	get name(): string {
		return this.identifier.text;
	}
}