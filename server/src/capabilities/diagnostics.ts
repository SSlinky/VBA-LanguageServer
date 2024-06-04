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

export class MissingAttributeDiagnostic extends BaseDiagnostic {
	message: string;
	severity = DiagnosticSeverity.Error;

	constructor(range: Range, attributeName: string) {
		super(range);
		this.message = `Module missing attribute ${attributeName}.`;
	}
}

export class DuplicateAttributeDiagnostic extends BaseDiagnostic {
	message: string;
	severity = DiagnosticSeverity.Error;

	constructor(range: Range, attributeName: string) {
		super(range);
		this.message = `Module duplicate attribute ${attributeName}.`;
	}
}

export class IgnoredAttributeDiagnostic extends BaseDiagnostic {
	message = "This attribute will be ignored.";
	severity = DiagnosticSeverity.Information;
	constructor(range: Range) {
		super(range);
	}
}

export class MissingOptionExplicitDiagnostic extends BaseDiagnostic {
	message = "Option Explicit is missing from module header.";
	severity = DiagnosticSeverity.Warning;
	constructor(range: Range) {
		super(range);
	}
}