// Core
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { ErrorNode, ParserRuleContext } from 'antlr4ng';

// Project
import { BaseContextSyntaxElement, BaseSyntaxElement } from './base';
import { DiagnosticCapability } from '../../capabilities/capabilities';
import { ParserErrorDiagnostic } from '../../capabilities/diagnostics';


export class ErrorRuleElement extends BaseContextSyntaxElement<ParserRuleContext> {
	constructor(node: ErrorNode, doc: TextDocument) {
		super(node.parent as ParserRuleContext, doc);
		this.diagnosticCapability = new DiagnosticCapability(this);
		this.diagnosticCapability.diagnostics.push(
			new ParserErrorDiagnostic(this.context.range, node.getText())
		);
	}
}