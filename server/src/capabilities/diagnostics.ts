// Core
import { CodeDescription, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, DiagnosticTag, Position, Range } from 'vscode-languageserver';


export type DiagnosticConstructor<T extends BaseDiagnostic> =
	(new (range: Range) => T) | (new (range: Range, message: string) => T);


export abstract class BaseDiagnostic implements Diagnostic {
	range: Range;
	message: string;
	severity?: DiagnosticSeverity | undefined;
	code?: string | number | undefined;
	codeDescription?: CodeDescription | undefined;
	source?: string | undefined;
	tags?: DiagnosticTag[] | undefined;
	relatedInformation?: DiagnosticRelatedInformation[] | undefined;
	data?: unknown;

	constructor(range: Range)
	constructor(range: Range, message: string)
	constructor(range: Range, message?: string) {
		this.range = range;
		this.message = message ?? 'Generic diagnostic.';
	}

	addRelatedInformation(information: DiagnosticRelatedInformation): void {
		if (!this.relatedInformation) {
			this.relatedInformation = [];
		}
		this.relatedInformation.push(information);
	}
}


export class MultipleOperatorsDiagnostic extends BaseDiagnostic {
	message = "Unexpected duplicate operator.";
	constructor(range: Range) {
		super(range);
	}
}


export class WhileWendDeprecatedDiagnostic extends BaseDiagnostic {
	message = "The Do...Loop statement provides a more structured and flexible way to perform looping.";
	severity = DiagnosticSeverity.Hint;
	constructor(range: Range) {
		super(Range.create(range.start, Position.create(range.start.line, range.start.character + 4)));
	}
}


export class MissingAttributeDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Error;
	constructor(range: Range, attributeName: string) {
		super(range, `Module missing attribute ${attributeName}.`);
	}
}


export class DuplicateAttributeDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Error;
	constructor(range: Range, attributeName: string) {
		super(range, `Module duplicate attribute ${attributeName}.`);
	}
}


// test
export class DuplicateDeclarationDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Error;
	constructor(range: Range, message: string) {
		super(range);
		this.message = `Duplicate declaration '${message}' in current scope.`;
	}
}


// test
export class ShadowDeclarationDiagnostic extends BaseDiagnostic {
	message = "Declaration is shadowed in the local scope.";
	severity = DiagnosticSeverity.Warning;
	constructor(range: Range) {
		super(range);
	}
}

export class VariableNotDefinedDiagnostic extends BaseDiagnostic {
	message = "Variable not defined.";
	severity = DiagnosticSeverity.Error;
	constructor(range: Range) {
		super(range);
	}
}

export class SubOrFunctionNotDefinedDiagnostic extends BaseDiagnostic {
	message = "Sub or Function not defined.";
	severity = DiagnosticSeverity.Error;
	constructor(range: Range) {
		super(range);
	}
}

// test
export class MethodVariableHasVisibilityModifierDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Information;
	constructor(range: Range, message: string) {
		super(range);
		this.message = `Visibility ignored for ${message} scoped variables.`;
	}
}

// test
export class MethodVariableIsPublicDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Warning;
	constructor(range: Range, message: string) {
		super(range);
		this.message = `${message} scoped variables cannot be public.`;
	}
}

// test
export class UnexpectedLineEndingDiagnostic extends BaseDiagnostic {
	message = "Unexpected line ending.";
	severity = DiagnosticSeverity.Error;
	constructor(range: Range) {
		super(range);
	}
}

// test
export class UnreachableCodeDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Hint;
	tags = [DiagnosticTag.Unnecessary];
	constructor(range: Range) {
		super(range);
	}
}


export class IgnoredAttributeDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Warning;
	constructor(range: Range, attributeName: string) {
		super(range, `Unknown attribute '${attributeName}' will be ignored.`);
	}
}


export class MissingOptionExplicitDiagnostic extends BaseDiagnostic {
	message = "Option Explicit is missing from module header.";
	severity = DiagnosticSeverity.Warning;
	constructor(range: Range) {
		super(range);
	}
}


export class ElementOutOfPlaceDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Error;
	constructor(range: Range, elementName: string) {
		super(range, `${elementName}s cannot appear below a Sub, Function, or Property declaration.`);
	}
}


export class LegacyFunctionalityDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Warning;
	constructor(range: Range, functionalityType: string) {
		super(range, `${functionalityType} are legacy functionality and should be avoided.`);
	}
}

export class ParserErrorDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Error;
	constructor(range: Range, msg: string) {
		super(range, msg);
	}
}