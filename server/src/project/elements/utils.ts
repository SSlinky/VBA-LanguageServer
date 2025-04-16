// Core
import { TextDocument } from 'vscode-languageserver-textdocument';

// Antlr
import { UnexpectedEndOfLineContext } from '../../antlr/out/vbaParser';

// Project
import { DiagnosticCapability } from '../../capabilities/capabilities';
import { BaseRuleSyntaxElement, HasDiagnosticCapability } from './base';
import { UnexpectedLineEndingDiagnostic } from '../../capabilities/diagnostics';


export class UnexpectedEndOfLineElement extends BaseRuleSyntaxElement<UnexpectedEndOfLineContext> implements HasDiagnosticCapability {
	diagnosticCapability: DiagnosticCapability;

	constructor(context: UnexpectedEndOfLineContext, document: TextDocument) {
		super(context, document);
		this.diagnosticCapability = new DiagnosticCapability(this, () => {
			this.diagnosticCapability.diagnostics.push(new UnexpectedLineEndingDiagnostic(this.context.range));
			return this.diagnosticCapability.diagnostics;
		});
	}
}