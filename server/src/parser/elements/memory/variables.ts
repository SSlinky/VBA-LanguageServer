import { TextDocument } from 'vscode-languageserver-textdocument';
import { VariableStmtContext } from '../../../antlr/out/vbaParser';
import { BaseDeclaration, BaseDeclarations } from './base';
import { SemanticTokenModifiers } from 'vscode-languageserver';


export class VariableDeclarationsElement extends BaseDeclarations {
	name = "VariableDeclarationsElement";

	constructor(ctx: VariableStmtContext, doc: TextDocument) {
		super(ctx, doc);

		const modifiers = this.getSemanticTokenModifiers(!!(ctx.STATIC()));
		this.createSemanticToken(modifiers);
	}

	private getSemanticTokenModifiers(isStatic: boolean): SemanticTokenModifiers[] {
		const result: SemanticTokenModifiers[] = [SemanticTokenModifiers.declaration];
		if(isStatic) { result.push(SemanticTokenModifiers.static); }
		return result;
	}
}

export class VariableDeclarationElement extends BaseDeclaration {
	name = "VariableDeclarationElement";
	constructor(ctx: VariableStmtContext, doc: TextDocument) {
		super(ctx, doc);
	}

	
}