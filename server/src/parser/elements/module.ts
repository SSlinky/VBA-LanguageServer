import { BaseElement, IdentifierElement } from './base';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { AttributeStmtContext, ModuleContext } from '../../antlr/out/vbaParser';
import { SymbolKind } from 'vscode-languageserver';
import { stripQuotes } from '../../utils/helpers';

export class ModuleElement extends BaseElement {
	readonly name = "ModuleElement";

	/**
	 * Override the base namespace function so that it's not recurring.
	 * Removes the quote marks from the identifier.
	 */
	get namespace() {
		return this.identifier?.name.replace(/^"(.*)"$/, '$1') ?? this.name;
	}

	constructor(ctx: ModuleContext, doc: TextDocument) {
		super(ctx, doc);
		this.symbolKind = SymbolKind.Module;
	}

	protected setIdentifierFromDoc(doc: TextDocument): void {
		const ctx = this.context as ModuleContext;
		const attrs = ctx.moduleAttributes();
		const vbName = attrs?.attributeStmt().find(
			x => x.implicitCallStmt_InStmt().text == "VB_Name")
			?.implicitCallStmt_InStmt().iCS_S_VariableOrProcedureCall();
		
		if (this.isIdentifiable(vbName)) {
			const identCtx = vbName.ambiguousIdentifier();
			if (identCtx) {
				this.identifier = new IdentifierElement(identCtx, doc);
			}
		}
	}
}

export class ModuleAttribute {
	identifier?: IdentifierElement;
	literal?: IdentifierElement;

	key = (): string => this.identifier?.text ?? 'Undefined';
	value = (): string => (this.literal) ? stripQuotes(this.literal.text) : 'Undefined';

	constructor(ctx: AttributeStmtContext, doc: TextDocument) {
		const idCtx = ctx
			.implicitCallStmt_InStmt()
			?.iCS_S_VariableOrProcedureCall()
			?.ambiguousIdentifier();

		if (idCtx) {
			this.identifier = new IdentifierElement(idCtx, doc);
			const pntCtx = idCtx.parent?.parent?.parent;
			if(pntCtx instanceof AttributeStmtContext) {
				this.literal = new IdentifierElement(idCtx, doc, pntCtx.literal(0)?.STRINGLITERAL()?.text);
			}
		}
	}
}