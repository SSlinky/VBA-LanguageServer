/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
	Hover,
} from 'vscode-languageserver/node';

import { LanguageTools } from './capabilities/ast';
import { activateSemanticTokenProvider } from './capabilities/vbaSemanticTokens';
import { ProjectInformation } from './docInfo';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
// const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Create the AST tools.
const service = new LanguageTools();

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

let docInfo: ProjectInformation;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	docInfo = new ProjectInformation(
		connection,
		hasConfigurationCapability,
		hasWorkspaceFolderCapability,
		hasDiagnosticRelatedInformationCapability);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			},
			foldingRangeProvider: true,
			hoverProvider: true,
			documentSymbolProvider: true
		}
	};
	activateSemanticTokenProvider(result);
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(e => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});


// connection.onHover(({textDocument, position}): Hover => {
// 	// Can make this into a proper hover provider later.
// 	return {
// 		contents: "Hello, HOVER world!"
// 	};
// });

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
// const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
// let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
// const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

// connection.onDidChangeConfiguration(change => {
// 	if (hasConfigurationCapability) {
// 		// Reset all cached document settings
// 		documentSettings.clear();
// 	} else {
// 		globalSettings = <ExampleSettings>(
// 			(change.settings.languageServerExample || defaultSettings)
// 		);
// 	}

// 	// Revalidate all open text documents
// 	docInfo.docs.all().forEach(validateTextDocument);
// });




// // Only keep settings for open documents
// documents.onDidClose(e => {
// 	documentSettings.delete(e.document.uri);
// });

// documents.onDidOpen(e => {
// 	service.evaluate(e.document);
// });

// // The content of a text document has changed. This event is emitted
// // when the text document first opened or when its content has changed.
// documents.onDidChangeContent(change => {
// 	// validateTextDocument(change.document);
// 	service.evaluate(change.document);
// });

// async function validateTextDocument(textDocument: TextDocument): Promise<void> {
// 	const settings = await getDocumentSettings(textDocument.uri);
// 	const v = new DocumentValidator(textDocument, settings.maxNumberOfProblems);

// 	service.evaluate(textDocument);
	
// 	// Validate use of .Select
// 	v.validate(/\.Select/g, "Don't use `Select`. Please.", DiagnosticSeverity.Warning);
	
	
// 	// Send the computed diagnostics to VSCode.
// 	const diagnostics: Diagnostic[] = v.diagnostics;
// 	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
// }

// class DocumentValidator {
// 	doc: TextDocument;
// 	text: string;
// 	problemLimit: integer;
// 	diagnostics: Diagnostic[];

// 	constructor(textDocument: TextDocument, problemLimit: integer) {
// 		this.doc = textDocument;
// 		this.text = textDocument.getText();
// 		this.problemLimit = problemLimit;
// 		this.diagnostics = [];
// 	}

// 	validate(pattern: RegExp, description: string, severity: DiagnosticSeverity) {
// 		let m: RegExpExecArray | null;
// 		while ((m = pattern.exec(this.text)) && this.problemLimit > 0) {
// 			this.problemLimit--;
// 			const d: Diagnostic = {
// 				severity: severity,
// 				range: {
// 					start: this.doc.positionAt(m.index + 1),
// 					end: this.doc.positionAt(m.index + m[0].length)
// 				},
// 				message: description,
// 				source: 'sslinky-vba',
// 				code: 666
// 			};
// 			if (hasDiagnosticRelatedInformationCapability) {
// 				d.relatedInformation = [
// 					{
// 						location: {
// 							uri: this.doc.uri,
// 							range: Object.assign({}, d.range)
// 						},
// 						message: 'Seriously though, don\'t use it.'
// 					},
// 					{
// 						location: {
// 							uri: this.doc.uri,
// 							range: Object.assign({}, d.range)
// 						},
// 						message: 'Ever.'
// 					}
// 				];
// 			}
// 			this.diagnostics.push(d);
// 		}
// 	}
// }


// This handler provides the initial list of the completion items.
// connection.onCompletion(
// 	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
// 		// The pass parameter contains the position of the text document in
// 		// which code complete got requested. For the example we ignore this
// 		// info and always provide the same completion items.
// 		return [
// 			{
// 				label: 'TypeScript',
// 				kind: CompletionItemKind.Text,
// 				data: 1
// 			},
// 			{
// 				label: 'JavaScript',
// 				kind: CompletionItemKind.Text,
// 				data: 2
// 			}
// 		];
// 	}
// );

// This handler resolves additional information for the item selected in
// the completion list.
// connection.onCompletionResolve(
// 	(item: CompletionItem): CompletionItem => {
// 		if (item.data === 1) {
// 			item.detail = 'TypeScript details';
// 			item.documentation = 'TypeScript documentation';
// 		} else if (item.data === 2) {
// 			item.detail = 'JavaScript details';
// 			item.documentation = 'JavaScript documentation';
// 		}
// 		return item;
// 	}
// );

// Make the text document manager listen on the connection
// for open, change and close text document events
// documents.listen(connection);

// Listen on the connection
connection.listen();

// // Event handler for folding ranges.
// connection.onFoldingRanges((params) => {
// 	const doc = documents.get(params.textDocument.uri);
// 	if (doc) {
// 		return getFoldingRanges(doc, Number.MAX_VALUE);
// 	}
// });

// Event pass-through to keep server.ts simple.
connection.onDidChangeWatchedFiles(c => docInfo.onDidChangeWatchedFiles(c));
connection.onDidChangeConfiguration((change => docInfo.onDidChangeConfiguration(change)));

connection.onHover((params) => docInfo.getHover(params));
connection.onCompletion((params) => docInfo.getCompletion(params));
connection.onFoldingRanges((params) => docInfo.getFoldingRanges(params.textDocument.uri));
connection.onDocumentSymbol((params) => docInfo.getDocumentSymbols(params.textDocument.uri));
connection.onCompletionResolve((item) => docInfo.getCompletionResolve(item));

// connection.onCodeAction;


// connection.onDocumentSymbol((params) => {
// 	const doc = documents.get(params.textDocument.uri);
// 	if (doc) {
// 		return service.symbolProvider.Symbols();
// 	}
// });