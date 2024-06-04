import { ParserRuleContext } from 'antlr4ng';
import { FoldingRangeKind } from '../../capabilities/folding';
import { BaseContextSyntaxElement, FoldingRangeElement, IdentifiableSyntaxElement } from './base';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';


export class FoldableElement extends BaseContextSyntaxElement implements FoldingRangeElement {
	range!: Range;
	foldingRangeKind?: FoldingRangeKind;
	
	constructor(ctx: ParserRuleContext, doc: TextDocument, foldingRangeKind?: FoldingRangeKind) {
		super(ctx, doc);
		this.foldingRangeKind = foldingRangeKind;
	}
}

export class ScopeElement extends FoldableElement implements ScopeElement {
	declaredNames: Map<string, IdentifiableSyntaxElement[]> = new Map();
	
	constructor(ctx: ParserRuleContext, doc: TextDocument) {
		super(ctx, doc);
	}

	protected _pushDeclaredName(element: IdentifiableSyntaxElement) {
		const name = element.identifier.text;
		const names: IdentifiableSyntaxElement[] = this.declaredNames.get(name) ?? [];
		names.push(element);
		this.declaredNames.set(name, names);
	}
}
