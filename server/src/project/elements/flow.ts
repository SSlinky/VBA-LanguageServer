import { ParserRuleContext } from 'antlr4ts';
import { BaseContextSyntaxElement, HasDiagnosticCapability } from './base';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ValueStmtContext, WhileWendStmtContext } from '../../antlr/out/vbaParser';
import { Diagnostic } from 'vscode-languageserver';
import { WhileWendDeprecatedDiagnostic } from '../../capabilities/diagnostics';


class BaseLoopElement extends BaseContextSyntaxElement {
	constructor(context: ParserRuleContext, document: TextDocument) {
		super(context, document);
	}
}


export class WhileWendLoopElement extends BaseLoopElement implements HasDiagnosticCapability {
	diagnostics: Diagnostic[] = [];
	valueStatement: ValueStatementElement;

	constructor(context: WhileWendStmtContext, document: TextDocument) {
		super(context, document);
		this.valueStatement = new ValueStatementElement(context.valueStmt(), document);
	}

	evaluateDiagnostics(): void {
		this.diagnostics.push(new WhileWendDeprecatedDiagnostic(this.valueStatement.range));
	}
}

class ValueStatementElement extends BaseContextSyntaxElement {
	constructor(context: ValueStmtContext, document: TextDocument) {
		super(context, document);
	}
}