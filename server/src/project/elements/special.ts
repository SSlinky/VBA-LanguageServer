import { ParserRuleContext } from 'antlr4ts';
import { FoldingRangeKind } from '../../capabilities/folding';
import { BaseContextSyntaxElement, FoldingRangeElement } from './base';
import { Range, TextDocument } from 'vscode-languageserver-textdocument';


export class FoldableElement extends BaseContextSyntaxElement implements FoldingRangeElement {
	range!: Range;
	foldingRangeKind?: FoldingRangeKind;
	
	constructor(ctx: ParserRuleContext, doc: TextDocument, foldingRangeKind?: FoldingRangeKind) {
		super(ctx, doc);
		this.foldingRangeKind = foldingRangeKind;
	}
}
