import { BaseElement } from './base';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { BaseTypeContext, ComplexTypeContext, ConstSubStmtContext, VariableSubStmtContext } from '../../antlr/out/vbaParser';

export class TypeContext extends BaseElement {
	readonly name = "TypeContext";
	constructor(ctx: BaseTypeContext | ComplexTypeContext, doc: TextDocument) {
		super(ctx, doc);
	}

	static create(ctx: VariableSubStmtContext | ConstSubStmtContext, doc: TextDocument): TypeContext | undefined {
		const xCtx = ctx.asTypeClause()?.type_();
		const tCtx = xCtx?.baseType() ?? xCtx?.complexType();
		if (tCtx) { return new TypeContext(tCtx, doc); }
	}
}


import { SemanticTokenTypes, SymbolKind } from 'vscode-languageserver';
import { EnumerationStmtContext, EnumerationStmt_ConstantContext } from '../../antlr/out/vbaParser';

export class EnumElement extends BaseElement {
	readonly name = "EnumElement";
	constructor(ctx: EnumerationStmtContext, doc: TextDocument) {
		super(ctx, doc);
		this.symbolKind = SymbolKind.Enum;
		if (this.identifier)
			this.identifier.createSemanticToken(SemanticTokenTypes.enum);
	}
}

export class EnumConstantElement extends BaseElement {
	readonly name = "EnumConstant";
	foldingRange = () => undefined;
	symbolInformation = (_: string) => undefined;
	constructor(ctx: EnumerationStmt_ConstantContext, doc: TextDocument) {
		super(ctx, doc);
		this.symbolKind = SymbolKind.EnumMember;
		if (this.identifier) {
			this.identifier.createSemanticToken(
				SemanticTokenTypes.enumMember);
		}
	}
}


import { LiteralContext } from '../../antlr/out/vbaParser';

export class LiteralElement extends BaseElement {
	name = "LiteralElement";
	private _valueString: string;

	constructor(ctx: LiteralContext, doc: TextDocument, name?: string) {
		super(ctx, doc);
		this._valueString = ctx.STRINGLITERAL.toString();
		if(name) this.name = name;
	}

	get valueString() {
		return this._valueString;
	}
}


import { ImplicitCallStmt_InBlockContext, ImplicitCallStmt_InStmtContext } from '../../antlr/out/vbaParser';

/**
* An implicit call can refer to a member call
* with a variable or procedure, e.g.,
* 	Module1.Greeting,
* 	dict.Item(itemKey).
*/
export class ImplicitCallElement extends BaseElement {
    readonly name = "ImplicitCallElement";
    constructor(ctx: ImplicitCallStmt_InBlockContext | ImplicitCallStmt_InStmtContext, doc: TextDocument) {
        super(ctx, doc);

    }
}