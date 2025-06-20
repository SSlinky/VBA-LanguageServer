// Core
import { CodeAction, CodeActionKind, CodeDescription, Command, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, DiagnosticTag, Position, Range } from 'vscode-languageserver';
import { Services } from '../injection/services';


export type DiagnosticConstructor<T extends BaseDiagnostic> =
	(new (range: Range) => T) | (new (range: Range, message: string) => T);


export abstract class BaseDiagnostic implements Diagnostic {
	range: Range;
	message: string;
	severity?: DiagnosticSeverity;
	code?: string | number;
	actionFactory?: (diagnostic: Diagnostic, uri: string) => CodeAction | Command;
	codeDescription?: CodeDescription;
	source?: string;
	tags?: DiagnosticTag[];
	relatedInformation?: DiagnosticRelatedInformation[];
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

	equals(diagnostic: Diagnostic) {
		return this.severity === diagnostic.severity
			&& this.message === diagnostic.message
			&& this.range.end.line === diagnostic.range.end.line
			&& this.range.start.line === diagnostic.range.start.line
			&& this.range.end.character === diagnostic.range.end.character
			&& this.range.start.character === diagnostic.range.start.character;
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
export class AmbiguousNameDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Error;
	constructor(range: Range, message: string) {
		super(range);
		this.message = `Ambiguous name detected: '${message}'.`;
	}
}

// test
export class CannotEvaluateExpressionDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Error;
	constructor(range: Range, message: string) {
		super(range);
		this.message = `Cannot evaluate expression: '${message}'.`;
	}
}

// test
export class ShadowDeclarationDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Warning;
	constructor(range: Range, message: string) {
		super(range);
		this.message = `${message} is shadowed in the local scope.`;
	}
}

export class VariableNotDefinedDiagnostic extends BaseDiagnostic {
	constructor(range: Range, message: string, public severity: DiagnosticSeverity) {
		super(range);
		this.message = `Variable ${message} not defined.`;
	}
}

export class SubOrFunctionNotDefinedDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Error;
	constructor(range: Range, message: string) {
		super(range);
		this.message = `Method ${message} not defined.`;
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
	severity = DiagnosticSeverity.Error;
	constructor(range: Range) {
		super(range, 'Unexpected line ending.');
	}
}

// test
export class UnreachableCodeDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Hint;
	tags = [DiagnosticTag.Unnecessary];
	constructor(range: Range) {
		super(range, 'Unreachable code detected.');
	}
}

// test
export class UnusedDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Hint;
	tags = [DiagnosticTag.Unnecessary];
	constructor(range: Range, message: string) {
		super(range, `${message} is declared but its value is never read.`);
	}
}


export class UnknownAttributeDiagnostic extends BaseDiagnostic {
	severity = DiagnosticSeverity.Error;
	constructor(range: Range, attributeName: string) {
		super(range, `Unknown attribute '${attributeName}'.`);
	}
}


export class MissingOptionExplicitDiagnostic extends BaseDiagnostic {
	message = "Option Explicit is missing from module header.";
	severity = DiagnosticSeverity.Hint;
	constructor(range: Range) {
		super(range);

		// Set up the properties that will enable the action.
		this.code = 'W001';
		this.actionFactory = (diagnostic: Diagnostic, uri: string) =>
			CodeAction.create(
				"Insert Option Explicit",
				{
					changes: {
						[uri]: [{
							range: diagnostic.range,
							newText: "\nOption Explicit"
						}]
					}
				},
				CodeActionKind.QuickFix
			);

		// Register the action factory to enable onActionRequest.
		Services.codeActionsRegistry.registerDiagnosticAction(this);
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