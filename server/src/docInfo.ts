import { CompletionItem, DidChangeConfigurationParams, DidChangeWatchedFilesParams, Hover, HoverParams, NotificationHandler, SymbolKind, TextDocumentPositionParams, TextDocuments, _Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { attachPartialResult } from 'vscode-languageserver/lib/common/progress';
import { ModuleAttribute, ModuleElement, SyntaxElement } from './utils/vbaSyntaxElements';
import { ResultsContainer, SyntaxParser } from './utils/vbaSyntaxParser';

interface ExampleSettings {
	maxNumberOfProblems: number;
}

const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

export class ProjectInformation {
	readonly conn: _Connection;
	readonly docs: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
	readonly docInfos: Map<string, DocumentInformation> = new Map();
	readonly docSettings: Map<string, Thenable<ExampleSettings>> = new Map();

	private hasConfigurationCapability = false;
	private hasWorkspaceFolderCapability = false;
	private hasDiagnosticRelatedInformationCapability = false;

	private readonly syntaxUtil: SyntaxParser;


	constructor(conn: _Connection, hasCfg: boolean, hasWsFld: boolean, hasDiag: boolean) {
		this.conn = conn;
		this.syntaxUtil = new SyntaxParser();
		this.hasConfigurationCapability = hasCfg;
		this.hasWorkspaceFolderCapability = hasWsFld;
		this.hasDiagnosticRelatedInformationCapability = hasDiag;
		this.addEventHandlers();

		this.docs.listen(conn);
	}


	onDidChangeConfiguration: NotificationHandler<DidChangeConfigurationParams> = (change => {
		if (this.hasConfigurationCapability) {
			this.docSettings.clear();
		} else {
			globalSettings = <ExampleSettings>(
				(change.settings.languageServerExample || defaultSettings)
			);
		}

		// Revalidate all open text documents
		// this.docs.all().forEach(validateTextDocument);
	});

	onDidChangeWatchedFiles: NotificationHandler<DidChangeWatchedFilesParams> = (params) => {
		this.conn.console.log(`onDidChangeWatchedFiles: ${params}`);
	};

	// TODO: Implement
	getFoldingRanges(docUri: string) {
		return [];
	}

	// TODO: Implement
	getDocumentSymbols(docUri: string) {
		return [];
	}

	// TODO: Implement
	getCompletion(params: TextDocumentPositionParams) {
		return [];
	}

	// TODO: Implement
	getCompletionResolve(item: CompletionItem): CompletionItem {
		return item;
	}

	getHover({textDocument, position}: HoverParams): Hover {
		return { contents: `${textDocument.uri}[${position.line}, ${position.character}]`};
	}

	

	private getDocumentSettings(docUri: string): Thenable<ExampleSettings> {
		if (!this.hasConfigurationCapability) {
			return Promise.resolve(globalSettings);
		}
		let result = this.docSettings.get(docUri);
		if (!result) {
			result = this.conn.workspace.getConfiguration({
				scopeUri: docUri,
				section: 'vbaLanguageServer'
			});
			this.docSettings.set(docUri, result);
		}
		return result;
	}

	private async addEventHandlers() {
		this.docs.onDidClose(e => {
			this.docSettings.delete(e.document.uri);
		});

		this.docs.onDidOpen(async e => {
			const uri = e.document.uri;
			const stg = await this.getDocumentSettings(uri);
			this.docSettings.set(uri, Promise.resolve(stg));
		});

		this.docs.onDidChangeContent(change => {
			const docInfo = new DocumentInformation();
			this.docInfos.set(change.document.uri, docInfo);
			this.syntaxUtil.parse(change.document, docInfo);
		});
	}
}

export class DocumentInformation implements ResultsContainer {
	addModule(element: ModuleElement) {
		//
	}

	addElement(element: SyntaxElement) {
		//
	}

	identifyElement(identifier: string) {
		//
	}

	setModuleAttribute(attr: ModuleAttribute) {
		//
	}

	setModuleSymbol(symbol: SymbolKind) {
		//
	}
}