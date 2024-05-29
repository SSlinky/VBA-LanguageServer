import { CodeDescription, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, DiagnosticTag, Range, TextDocumentClientCapabilities } from 'vscode-languageserver';


function hasDiagnosticRelatedInformationCapability(x: TextDocumentClientCapabilities) {
	return !!(x && x.publishDiagnostics && x.publishDiagnostics.relatedInformation);
}

abstract class BaseDiagnostic implements Diagnostic {
	range: Range;
	severity?: DiagnosticSeverity | undefined;
	code?: string | number | undefined;
	codeDescription?: CodeDescription | undefined;
	source?: string | undefined;
	abstract message: string;
	tags?: DiagnosticTag[] | undefined;
	relatedInformation?: DiagnosticRelatedInformation[] | undefined;
	data?: unknown;

	constructor(range: Range) {
		this.range = range;
	}
}


export class MultipleOperatorsDiagnostic extends BaseDiagnostic {
	message = "Unexpected duplicate operator";
	constructor(range: Range) {
		super(range);
	}
}

export class WhileWendDeprecatedDiagnostic extends BaseDiagnostic {
	message = "The Do...Loop statement provides a more structured and flexible way to perform looping.";
	severity = DiagnosticSeverity.Information;
	constructor(range: Range) {
		super(range);
	}
}