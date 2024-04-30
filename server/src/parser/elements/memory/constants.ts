import { TextDocument } from 'vscode-languageserver-textdocument';
import { ConstStmtContext } from '../../../antlr/out/vbaParser';
import { BaseDeclarations } from './base';
import { SemanticTokenModifiers } from 'vscode-languageserver';



export class ConstDeclarationElement extends BaseDeclarations {
	name = "ConstDeclarationElement";
	constructor(ctx: ConstStmtContext, doc: TextDocument) {
		super(ctx, doc);

		const modifiers = this.getSemanticTokenModifiers();
		this.createSemanticToken(modifiers);
	}

	private getSemanticTokenModifiers = (): SemanticTokenModifiers[] =>
		[SemanticTokenModifiers.declaration, SemanticTokenModifiers.readonly];
}