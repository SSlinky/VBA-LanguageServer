// Core
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { AnyOperatorContext, WhileStatementContext } from '../../antlr/out/vbaParser';

// Project
import { DiagnosticCapability, FoldingRangeCapability } from '../../capabilities/capabilities';
import { BaseContextSyntaxElement, HasDiagnosticCapability } from './base';
import { MultipleOperatorsDiagnostic, WhileWendDeprecatedDiagnostic } from '../../capabilities/diagnostics';


export class WhileLoopElement extends BaseContextSyntaxElement<WhileStatementContext> implements HasDiagnosticCapability {
	diagnosticCapability: DiagnosticCapability;

	constructor(context: WhileStatementContext, document: TextDocument) {
		super(context, document);
		this.foldingRangeCapability = new FoldingRangeCapability(this);
		this.diagnosticCapability = new DiagnosticCapability(this, () => {
			this.diagnosticCapability.diagnostics.push(new WhileWendDeprecatedDiagnostic(this.context.range));
			return this.diagnosticCapability.diagnostics;
		});
	}
}


export class DuplicateOperatorElement extends BaseContextSyntaxElement<AnyOperatorContext> implements HasDiagnosticCapability {
	diagnosticCapability: DiagnosticCapability;

	constructor(context: AnyOperatorContext, document: TextDocument) {
		super(context, document);
		this.diagnosticCapability = new DiagnosticCapability(this, () => {
			this.diagnosticCapability.diagnostics.push(new MultipleOperatorsDiagnostic(this.context.range));
			return this.diagnosticCapability.diagnostics;
		});
	}
}