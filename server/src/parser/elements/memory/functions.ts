import { TextDocument } from 'vscode-languageserver-textdocument';
import { ArgListContext } from '../../../antlr/out/vbaParser';
import { BaseDeclarations, BaseDeclaration, Visibility } from './base';



export class FunctionDeclarationElement extends BaseDeclaration {
	name = "FunctionDeclarationElement";
	visibility = Visibility.Public;
}

export class ArgDeclarationsElement extends BaseDeclarations {
	name = "ArgDeclarationsElement";

	constructor(ctx: ArgListContext, doc: TextDocument) {
		super(ctx, doc);
	}
}