import { ParserRuleContext } from 'antlr4ts';
import { Override } from 'antlr4ts/Decorators';
import { Range, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { AmbiguousIdentifierContext, AttributeStmtContext, BaseTypeContext, ComplexTypeContext, FunctionStmtContext, ModuleContext, Subscript_Context, SubStmtContext } from '../antlr/out/vbaParser';
import { stripQuotes } from './helpers';

export {SyntaxElement, ModuleElement, ModuleAttribute, MethodElement, getCtxOriginalText};

interface SyntaxElement {
	text: string;
	range: Range;
	identifier: string;
	context: ParserRuleContext;
	symbolInformation?: SymbolInformation;
}

interface Identifiable {
	ambiguousIdentifier(): AmbiguousIdentifierContext;
}

abstract class BaseElement implements SyntaxElement {
	text: string;
	range: Range;
	identifier: string;
	context: ParserRuleContext;	

	constructor(ctx: ParserRuleContext, doc: TextDocument) {
		this.context = ctx;
		this.identifier = "";
		this.range = getCtxRange(ctx, doc);
		this.text = doc.getText(this.range);
		this.setIdentifierFromDoc(doc);
	}

	private setIdentifierFromDoc(doc: TextDocument): void {
		if (this.isIdentifiable(this.context)) {
			const identCtx = this.context.ambiguousIdentifier();
			if (identCtx) {
				this.identifier = getCtxOriginalText(identCtx, doc);
			}
		}
	}

	private isIdentifiable(object: any): object is Identifiable {
		return 'ambiguousIdentifier' in object;
	}

	// setIdentifier(identifier: string): void {
	// 	if (this.identifier === "") {
	// 		this.identifier = identifier;
	// 	}
	// }
}

class ModuleElement extends BaseElement {
	symbolInformation?: SymbolInformation;
	// private static readonly DEFAULT_NAME = 'Module';

	constructor(ctx: ModuleContext, doc: TextDocument) {
		super(ctx, doc);
		// this.identifier = ModuleElement.DEFAULT_NAME;
	}

	// setModuleIdentifier(identifier: string): void {
	// 	if (this.identifier === ModuleElement.DEFAULT_NAME && identifier.startsWith('MOD:')) {
	// 		this.identifier = identifier.split(':')[1];
	// 	}
	// }
}

class MethodElement extends BaseElement {
	symbolInformation?: SymbolInformation;
	returnType: TypeContext | undefined;

	constructor(ctx: FunctionStmtContext | SubStmtContext, doc: TextDocument) {
		super(ctx, doc);
		if (ctx instanceof FunctionStmtContext) {
			this.returnType = this.getReturnType();
		}
	}

	private getReturnType(): TypeContext | undefined {
		const ctx = this.context as FunctionStmtContext;
		const asTypeCtx = ctx.asTypeClause();
		if (!asTypeCtx) { return; }

	}

}

class ModuleAttribute {
	attribute: string;
	value: string;

	constructor(ctx: AttributeStmtContext, doc: TextDocument) {
		const idCtx = ctx.implicitCallStmt_InStmt()?.iCS_S_VariableOrProcedureCall()?.ambiguousIdentifier();
		this.attribute = (idCtx) ? getCtxOriginalText(idCtx, doc) : 'Undefined';

		const valCtx = ctx.literal(0);
		this.value = (valCtx) ? stripQuotes(getCtxOriginalText(valCtx, doc)) : 'Undefined';
	}
}

class TypeContext extends BaseElement {
	constructor(ctx: BaseTypeContext | ComplexTypeContext, doc: TextDocument) {
		super(ctx, doc);
	}
}

function getCtxOriginalText(ctx: ParserRuleContext, doc: TextDocument): string {
	const range = getCtxRange(ctx, doc);
	return doc.getText(range);
}

function getCtxRange(ctx: ParserRuleContext, doc: TextDocument): Range {
	const start = ctx.start.startIndex;
	const stop = ctx.stop?.stopIndex ?? start;
	return Range.create(
		doc.positionAt(start),
		doc.positionAt(stop + 1));
}