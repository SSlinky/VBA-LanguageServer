// Core
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { ErrorNode, TerminalNode } from 'antlr4ng';

// Project
import { BaseSyntaxElement, Context } from './base';
import { DiagnosticCapability } from '../../capabilities/capabilities';
import { ParserErrorDiagnostic } from '../../capabilities/diagnostics';


export class ErrorRuleElement extends BaseSyntaxElement {
	context: Context<TerminalNode>;
	constructor(node: ErrorNode, doc: TextDocument) {
		super();
		this.context = new Context(node, doc);
		this.diagnosticCapability = new DiagnosticCapability(this);
		this.diagnosticCapability.diagnostics.push(
			new ParserErrorDiagnostic(this.context.range, node.getText())
		);
	}
}