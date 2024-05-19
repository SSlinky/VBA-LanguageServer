import { TextDocumentClientCapabilities } from 'vscode-languageserver';


function hasDiagnosticRelatedInformationCapability(x: TextDocumentClientCapabilities) {
	return !!(x && x.publishDiagnostics && x.publishDiagnostics.relatedInformation);
}