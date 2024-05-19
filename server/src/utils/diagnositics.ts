import { CompletionItem, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, DidChangeConfigurationParams, DidChangeWatchedFilesParams, DocumentSymbol, FoldingRange, Hover, HoverParams, Location, NotificationHandler, Position, PublishDiagnosticsParams, Range, SemanticTokenModifiers, SemanticTokens, SemanticTokensParams, SemanticTokensRangeParams, SemanticTokensRequest, SymbolInformation, SymbolKind, TextDocumentPositionParams, TextDocuments, uinteger, _Connection, integer } from 'vscode-languageserver';


abstract class BaseDiagnostic {
	description: string;
	severity: DiagnosticSeverity;
	errCode: integer;	

	constructor() {
		this.description = "Not assigned!";
		this.severity = DiagnosticSeverity.Information;		
		this.errCode = 0;
	}

	create(range: Range, relatedInfo?: DiagnosticRelatedInformation[] | undefined) {
		return Diagnostic.create(
			range,
			this.description,
			this.severity,
			this.errCode,
			"VBAPro",
			relatedInfo
		);
	}
}

export class AmbiguousDeclarationDiagnostic extends BaseDiagnostic {
	description = "Ambiguous variable declaration.";
	severity = DiagnosticSeverity.Error;
	errCode = 500;
	
}

export class MissingDeclarationDiagnostic extends BaseDiagnostic {
	description = "No declaration for variable or method.";
	errCode = 404;

	constructor (severity: DiagnosticSeverity) {
		super();
		this.severity = severity;
	}
}