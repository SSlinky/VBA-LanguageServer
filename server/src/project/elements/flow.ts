// Core
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { AnyOperatorContext, IfStatementContext, WhileStatementContext } from '../../antlr/out/vbaParser';

// Project
import { DiagnosticCapability, FoldingRangeCapability } from '../../capabilities/capabilities';
import { BaseRuleSyntaxElement, HasDiagnosticCapability } from './base';
import { MultipleOperatorsDiagnostic, WhileWendDeprecatedDiagnostic } from '../../capabilities/diagnostics';

export class IfElseBlockElement extends BaseRuleSyntaxElement<IfStatementContext> {
	constructor(context: IfStatementContext, document: TextDocument) {
		super(context, document);
		this.foldingRangeCapability = new FoldingRangeCapability(this);
		this.foldingRangeCapability.openWord = 'If';
		this.foldingRangeCapability.closeWord = 'End If';
	}
}


export class WhileLoopElement extends BaseRuleSyntaxElement<WhileStatementContext> implements HasDiagnosticCapability {
	diagnosticCapability: DiagnosticCapability;

	constructor(context: WhileStatementContext, document: TextDocument) {
		super(context, document);
		this.foldingRangeCapability = new FoldingRangeCapability(this);
		this.foldingRangeCapability.openWord = 'While';
		this.foldingRangeCapability.closeWord = 'Wend';
		this.diagnosticCapability = new DiagnosticCapability(this, () => {
			this.diagnosticCapability.diagnostics.push(new WhileWendDeprecatedDiagnostic(this.context.range));
			return this.diagnosticCapability.diagnostics;
		});
	}
}


export class DuplicateOperatorElement extends BaseRuleSyntaxElement<AnyOperatorContext> implements HasDiagnosticCapability {
	diagnosticCapability: DiagnosticCapability;

	constructor(context: AnyOperatorContext, document: TextDocument) {
		super(context, document);
		this.diagnosticCapability = new DiagnosticCapability(this, () => {
			this.diagnosticCapability.diagnostics.push(new MultipleOperatorsDiagnostic(this.context.range));
			return this.diagnosticCapability.diagnostics;
		});
	}
}