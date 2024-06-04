import { ParserRuleContext } from 'antlr4ng';
import { FoldingRangeKind } from '../../capabilities/folding';
import { BaseContextSyntaxElement, FoldingRangeElement, IdentifiableSyntaxElement } from './base';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';
import { PropertyDeclarationElement } from './memory';


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

	pushDeclaredName(element: IdentifiableSyntaxElement): void {
		const name = element.identifier.text;
		const names: IdentifiableSyntaxElement[] = this.declaredNames.get(name) ?? [];
		names.push(element);
		this.declaredNames.set(name, names);
	}

	isPropertyElement(): this is PropertyDeclarationElement {
		return 'getDeclarations' in this;
	}
}
