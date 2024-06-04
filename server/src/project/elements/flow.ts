import { Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { WhileStatementContext } from '../../antlr/out/vbaParser';

import { BaseContextSyntaxElement, HasDiagnosticCapability } from './base';
import { WhileWendDeprecatedDiagnostic } from '../../capabilities/diagnostics';


export class WhileLoopElement extends BaseContextSyntaxElement implements HasDiagnosticCapability {
	diagnostics: Diagnostic[] = [];

	constructor(context: WhileStatementContext, document: TextDocument) {
		super(context, document);
		
	}

	evaluateDiagnostics(): void {
		this.diagnostics.push(new WhileWendDeprecatedDiagnostic(this.range))
	}
}
