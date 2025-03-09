// Core
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
	CancellationToken,
	CancellationTokenSource,
	CompletionItem,
	CompletionParams,
	DidChangeConfigurationNotification,
	DidChangeWatchedFilesParams,
	DidOpenTextDocumentParams,
	DocumentDiagnosticParams,
	DocumentDiagnosticReport,
	DocumentDiagnosticReportKind,
	DocumentFormattingParams,
	DocumentSymbolParams,
	FoldingRange,
	FoldingRangeParams,
	Hover,
	HoverParams,
	SemanticTokensRangeParams,
	SymbolInformation,
	TextDocuments,
	TextEdit,
	WorkspaceFoldersChangeEvent,
	_Connection
} from 'vscode-languageserver';

import { BaseProjectDocument } from './document';
import { LanguageServerConfiguration } from '../server';
import { hasConfigurationCapability } from '../capabilities/workspaceFolder';
import { sleep } from '../utils/helpers';
import { NamespaceManager } from './scope';
import { ParseCancellationException } from 'antlr4ng';
import { getFormattingEdits } from './formatter';
import { VbaFmtListener } from './parser/vbaListener';


/**
 * Organises project documents and runs actions at a workspace level.
 */
export class Workspace {
	private events: WorkspaceEvents;
	private nsManager: NamespaceManager = new NamespaceManager();
	private documents: BaseProjectDocument[] = [];
	private parseCancellationTokenSource?: CancellationTokenSource;

	private _activeDocument?: BaseProjectDocument;
	private readonly _hasConfigurationCapability: boolean;

	get hasConfigurationCapability() {
		return this._hasConfigurationCapability;
	}
	
	readonly connection: _Connection;

	get activeDocument() {
		return this._activeDocument;
	}

	get namespaceManager() {
		return this.nsManager;
	}

	constructor(params: {connection: _Connection, capabilities: LanguageServerConfiguration}) {
		this.connection = params.connection;
		this._hasConfigurationCapability = hasConfigurationCapability(params.capabilities);
		this.events = new WorkspaceEvents({
			workspace: this,
			connection: params.connection,
			configuration: params.capabilities,
		});
	}

	activateDocument(document?: BaseProjectDocument) {
		if (document) {
			this._activeDocument = document;
		}
	}

	async parseActiveDocument(document?: BaseProjectDocument) {
		this.activateDocument(document);
		this.parseCancellationTokenSource?.cancel();
		this.parseCancellationTokenSource = new CancellationTokenSource();

		// Exceptions thrown by the parser should be ignored.
		try {
			await this.activeDocument?.parseAsync(this.parseCancellationTokenSource.token);
		} catch (error) {
			this.connection.console.log(`Parser error: ${error}`)
		}

		this.parseCancellationTokenSource = undefined;
	}

	async formatParseDocument(document: TextDocument): Promise<VbaFmtListener | undefined> {
		this.parseCancellationTokenSource?.cancel();
		this.parseCancellationTokenSource = new CancellationTokenSource();

		// Exceptions thrown by the parser should be ignored.
		let result: VbaFmtListener | undefined;
		try { result = await this.activeDocument?.formatParseAsync(this.parseCancellationTokenSource.token); }
		catch (error) { this.connection.console.log(`Parser error: ${error}`) }

		this.parseCancellationTokenSource = undefined;
		return result;
	}

	/**
	 * Registers a declaration or pushes an ambiguous name diagnostic.
	 */
	registerNamedElementDeclaration(element: any) {
		// Check document names for existing entry.
		// Check for public scope for existing entry.

		throw new Error("Not implemented");
	}

	/**
	 * Pushes an overriding name diagnostic if overriding public scope.
	 * @param element The element to check.
	 */
	checkNamedElementDeclaration(element: any) {
		throw new Error("Not implemented");
	}

	requestDocumentSettings = async (resource: string) =>
		await this.connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'vbaLanguageServer'
		});

	clearDocumentsConfiguration = () => {
		this.documents.forEach(d => d.clearDocumentConfiguration());
		this.connection.languages.diagnostics.refresh();
	}
}


// TODO: This class should not be doing anything with connection.
class WorkspaceEvents {
	private readonly workspace: Workspace;
	private readonly documents: TextDocuments<TextDocument>;
	private readonly configuration: LanguageServerConfiguration;
	private readonly parsedDocuments: Map<string, BaseProjectDocument>;

	private activeDocument?: BaseProjectDocument;

	constructor(params: {connection: _Connection, workspace: Workspace, configuration: LanguageServerConfiguration}) {
		this.workspace = params.workspace;
		this.configuration = params.configuration;
		this.documents = new TextDocuments(TextDocument);
		this.parsedDocuments = new Map<string, BaseProjectDocument>();
		this.initialiseConnectionEvents(params.connection);
		this.initialiseDocumentsEvents();
		this.documents.listen(params.connection);
	}

	/**
	 * 
	 * @param version the target document version (zero for any version).
	 * @param token the cancellation token.
	 * @returns the document when it is ready or undefined.
	 */
	private async activeParsedDocument(version: number, token: CancellationToken): Promise<BaseProjectDocument|undefined> {
		let document: BaseProjectDocument | undefined;
		document = this.activeDocument;
		
		// Sleep between attempting to grab the document.
		// Loop while we have undefined or an earlier version.
		while (!document || document.textDocument.version < version) {
			if (token.isCancellationRequested) {
				return;
			}
			await sleep(5);
			document = this.activeDocument;
		}

		// Return if the version somehow outpaced us.
		if (version > 0 && document.textDocument.version != version) {
			return;
		}

		// Return the parsed document.
		while (document.isBusy) {
			await sleep(5);
		}
		return document;
	}

	private async getParsedDocument(uri: string, version: number, token: CancellationToken): Promise<BaseProjectDocument|undefined> {
		// Handle token cancellation.
		if (token.isCancellationRequested) { throw new Error("Request cancelled before start."); }
		token.onCancellationRequested(() => { throw new Error("Request cancelled during run."); });

		let document: BaseProjectDocument | undefined;
		document = this.parsedDocuments.get(uri);

		// Ensure we have the appropriately versioned document.
		while (!document || document.textDocument.version < version) {
			await sleep(5);
			document = this.parsedDocuments.get(uri);
		}

		// Return nothing if the document version is newer than requested.
		if (version > 0 && document.textDocument.version != version) {
			return;
		}

		// Ensure the document is parsed.
		while (document.isBusy) {
			await sleep(5);
		}

		return document;
	}

	private initialiseConnectionEvents(connection: _Connection) {
		connection.onInitialized(() => this.onInitialized());
		connection.onDidOpenTextDocument(params => this.onDidOpenTextDocumentAsync(params));
		connection.onCompletion(params => this.onCompletion(params));
		connection.onCompletionResolve(item => this.onCompletionResolve(item));
		connection.onDidChangeConfiguration(_ => this.workspace.clearDocumentsConfiguration());
		connection.onDidChangeWatchedFiles(params => this.onDidChangeWatchedFiles(params));
		connection.onDocumentSymbol(async (params, token) => await this.onDocumentSymbolAsync(params, token));
		connection.onHover(params => this.onHover(params));
		connection.languages.diagnostics.on(async (params, token) => await this.onDiagnosticAsync(params, token));
		connection.onDocumentFormatting(params => this.onDocumentFormatting(params));

		if (hasConfigurationCapability(this.configuration)) {
			connection.onFoldingRanges(async (params, token) => this.onFoldingRangesAsync(params, token));
		}

		connection.onRequest((method: string, params: object | object[] | any) => {
			switch (method) {
				case 'textDocument/semanticTokens/full': {
					return this.activeDocument?.languageServerSemanticTokens();
				}
				case 'textDocument/semanticTokens/range': {
					const rangeParams = params as SemanticTokensRangeParams;
					return this.activeDocument?.languageServerSemanticTokens(rangeParams.range);
				}
				default:
					console.error(`Unresolved request path: ${method}`);
			}
		});
	}

	private initialiseDocumentsEvents() {
		this.documents.onDidChangeContent(async (e) => await this.onDidChangeContentAsync(e.document));
	}

	/** Connection event handlers */

	private onCompletion(params: CompletionParams): never[] {
		return [];
	}

	private onCompletionResolve(item: CompletionItem): CompletionItem {
		return item;
	}

	private onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams) {
		return;
	}

	// TODO: Should trigger a full workspace refresh.
	private onDidChangeWorkspaceFolders(e: WorkspaceFoldersChangeEvent) {
		this.workspace.connection.console.log(`Workspace folder change event received.\n${e}`);
	}

	private async onDocumentSymbolAsync(params: DocumentSymbolParams, token: CancellationToken): Promise<SymbolInformation[]> {
		const document = await this.activeParsedDocument(0, token);
		return document?.languageServerSymbolInformation() ?? [];
	}

	private async onDiagnosticAsync(params: DocumentDiagnosticParams, token: CancellationToken): Promise<DocumentDiagnosticReport> {
		const document = await this.activeParsedDocument(0, token);
		return document?.languageServerDiagnostics() ?? {
			kind: DocumentDiagnosticReportKind.Full,
			items: []
		} satisfies DocumentDiagnosticReport;
	}

	private async onFoldingRangesAsync(params: FoldingRangeParams, token: CancellationToken): Promise<FoldingRange[]> {
		let document: BaseProjectDocument | undefined;
		try {
			document = await this.getParsedDocument(params.textDocument.uri, 0, token);
		} catch (error) {
			// Swallow parser cancellations and rethrow anything else.
			if (!!(error instanceof ParseCancellationException)) {
				throw error;
			}
			// this.workspace.connection.window.showInformationMessage(`Parser error: ${error}`);
		}
		const result = document?.languageServerFoldingRanges();
		return result ?? [];
	}

	private onHover(params: HoverParams): Hover {
		console.debug(`onHover`);
		return { contents: '' };
	}

	private onInitialized(): void {
		const connection = this.workspace.connection;
		// Register for client configuration notification changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);

		// This is how we can listen for changes to workspace folders.
		if (hasConfigurationCapability(this.configuration)) {
			connection.workspace.onDidChangeWorkspaceFolders(e =>
				this.onDidChangeWorkspaceFolders(e)
			);
			connection.client.register(DidChangeConfigurationNotification.type, undefined);
		}
	}

	private async onDocumentFormatting(params: DocumentFormattingParams): Promise<TextEdit[]> {
		const doc = this.documents.get(params.textDocument.uri);
		if (!doc) return [];
		// const infoMsg = `onDocumentFormatting called: ${params.textDocument.uri}\n${doc?.getText({start: {line: 4, character: 0}, end: {line: 4, character: 100}}) ?? "NO DOC!"}`
		// this.workspace.connection.window.showInformationMessage(`onDocumentFormatting called: ${infoMsg}`)
		const parseResult = await this.workspace.formatParseDocument(doc);

		return parseResult ? getFormattingEdits(doc, parseResult) : [];
	}

	/** Documents event handlers */

	/**
	 * This event handler is called whenever a `TextDocuments<TextDocument>` is changed.
	 * @param doc The document that changed.
	 */
	async onDidOpenTextDocumentAsync(params: DidOpenTextDocumentParams) {
		await this.handleChangeOrOpenAsync(TextDocument.create(
			params.textDocument.uri,
			params.textDocument.languageId,
			params.textDocument.version,
			params.textDocument.text
		));
	}

	async onDidChangeContentAsync(document: TextDocument) {
		await this.handleChangeOrOpenAsync(document);
	}

	protected async handleChangeOrOpenAsync(document: TextDocument) {
		const doc = BaseProjectDocument.create(this.workspace, document);
		this.parsedDocuments.set(document.uri, doc);
		this.activeDocument = doc;
		await this.workspace.parseActiveDocument(this.activeDocument);
	}
}
