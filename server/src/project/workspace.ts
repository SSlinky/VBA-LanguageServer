import { CancellationToken, CancellationTokenSource, CompletionItem, CompletionParams, DidChangeConfigurationNotification, DidChangeWatchedFilesParams, DidOpenTextDocumentParams, DocumentDiagnosticParams, DocumentDiagnosticReport, DocumentDiagnosticReportKind, DocumentSymbolParams, FoldingRange, FoldingRangeParams, Hover, HoverParams, SemanticTokensRangeParams, SymbolInformation, TextDocuments, WorkspaceFoldersChangeEvent, _Connection } from 'vscode-languageserver';
import { BaseProjectDocument } from './document';
import { LanguageServerConfiguration } from '../server';
import { hasConfigurationCapability } from '../capabilities/workspaceFolder';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { sleep } from '../utils/helpers';
import { NamespaceManager } from './scope';


/**
 * Organises project documents and runs actions
 * at a workspace level.
 */
export class Workspace {
	private _events: WorkspaceEvents;
	private _nsManager: NamespaceManager = new NamespaceManager();
	private _documents: BaseProjectDocument[] = [];
	private _activeDocument?: BaseProjectDocument;
	private _parseCancellationTokenSource?: CancellationTokenSource;
	private readonly _hasConfigurationCapability: boolean;

	get hasConfigurationCapability() {
		return this._hasConfigurationCapability;
	}
	
	readonly connection: _Connection;

	get activeDocument() {
		return this._activeDocument;
	}

	get namespaceManager() {
		return this._nsManager;
	}

	constructor(params: {connection: _Connection, capabilities: LanguageServerConfiguration}) {
		this.connection = params.connection;
		this._hasConfigurationCapability = hasConfigurationCapability(params.capabilities);
		this._events = new WorkspaceEvents({
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
		this._parseCancellationTokenSource?.cancel();
		this._parseCancellationTokenSource = new CancellationTokenSource();

		// Exceptions thrown by the parser should be ignored.
		try {
			await this._activeDocument?.parseAsync(this._parseCancellationTokenSource.token);
		} catch (error) {
			this.connection.console.log(`Parser error: ${error}`)
		}

		this._parseCancellationTokenSource = undefined;
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
		this._documents.forEach(d => d.clearDocumentConfiguration());
		this.connection.languages.diagnostics.refresh();
	}
}

// TODO: This class should not be doing anything with connection.
class WorkspaceEvents {
	private readonly _workspace: Workspace;
	private readonly _documents: TextDocuments<TextDocument>;
	private readonly _configuration: LanguageServerConfiguration;
	private readonly _parsedDocuments: Map<string, BaseProjectDocument>;

	private _activeDocument?: BaseProjectDocument;

	constructor(params: {connection: _Connection, workspace: Workspace, configuration: LanguageServerConfiguration}) {
		this._workspace = params.workspace;
		this._configuration = params.configuration;
		this._documents = new TextDocuments(TextDocument);
		this._parsedDocuments = new Map<string, BaseProjectDocument>();
		this.initialiseConnectionEvents(params.connection);
		this._initialiseDocumentsEvents();
		this._documents.listen(params.connection);
	}

	/**
	 * 
	 * @param version the target document version (zero for any version).
	 * @param token the cancellation token.
	 * @returns the document when it is ready or undefined.
	 */
	private async activeParsedDocument(version: number, token: CancellationToken): Promise<BaseProjectDocument|undefined> {
		let document: BaseProjectDocument | undefined;
		document = this._activeDocument;
		
		// Sleep between attempting to grab the document.
		// Loop while we have undefined or an earlier version.
		while (!document || document.textDocument.version < version) {
			if (token.isCancellationRequested) {
				return;
			}
			await sleep(5);
			document = this._activeDocument;
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
		document = this._parsedDocuments.get(uri);

		// Ensure we have the appropriately versioned document.
		while (!document || document.textDocument.version < version) {
			await sleep(5);
			document = this._parsedDocuments.get(uri);
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
		connection.onInitialized(() => this._onInitialized());
		connection.onDidOpenTextDocument(params => this._onDidOpenTextDocumentAsync(params));
		connection.onCompletion(params => this._onCompletion(params));
		connection.onCompletionResolve(item => this._onCompletionResolve(item));
		connection.onDidChangeConfiguration(_ => this._workspace.clearDocumentsConfiguration());
		connection.onDidChangeWatchedFiles(params => this._onDidChangeWatchedFiles(params));
		connection.onDocumentSymbol(async (params, token) => await this._onDocumentSymbolAsync(params, token));
		connection.onHover(params => this._onHover(params));
		connection.languages.diagnostics.on(async (params, token) => await this._onDiagnosticAsync(params, token));

		if (hasConfigurationCapability(this._configuration)) {
			connection.onFoldingRanges(async (params, token) => this._onFoldingRangesAsync(params, token));
		}

		connection.onRequest((method: string, params: object | object[] | any) => {
			switch (method) {
				case 'textDocument/semanticTokens/full': {
					return this._activeDocument?.languageServerSemanticTokens();
				}
				case 'textDocument/semanticTokens/range': {
					const rangeParams = params as SemanticTokensRangeParams;
					return this._activeDocument?.languageServerSemanticTokens(rangeParams.range);
				}
				default:
					console.error(`Unresolved request path: ${method}`);
			}
		});
	}

	

	private _initialiseDocumentsEvents() {
		this._documents.onDidChangeContent(async (e) => await this.onDidChangeContentAsync(e.document));
	}

	/** Connection event handlers */

	private _onCompletion(params: CompletionParams): never[] {
		return [];
	}

	private _onCompletionResolve(item: CompletionItem): CompletionItem {
		return item;
	}

	private _onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams) {
		return;
	}

	// TODO: Should trigger a full workspace refresh.
	private _onDidChangeWorkspaceFolders(e: WorkspaceFoldersChangeEvent) {
		this._workspace.connection.console.log(`Workspace folder change event received.\n${e}`);
	}

	private async _onDocumentSymbolAsync(params: DocumentSymbolParams, token: CancellationToken): Promise<SymbolInformation[]> {
		const document = await this.activeParsedDocument(0, token);
		return document?.languageServerSymbolInformation() ?? [];
	}

	private async _onDiagnosticAsync(params: DocumentDiagnosticParams, token: CancellationToken): Promise<DocumentDiagnosticReport> {
		const document = await this.activeParsedDocument(0, token);
		return document?.languageServerDiagnostics() ?? {
			kind: DocumentDiagnosticReportKind.Full,
			items: []
		} satisfies DocumentDiagnosticReport;
	}

	private async _onFoldingRangesAsync(params: FoldingRangeParams, token: CancellationToken): Promise<FoldingRange[]> {
		const document = await this.getParsedDocument(params.textDocument.uri, 0, token);
		const result = document?.languageServerFoldingRanges();
		return result ?? [];
	}

	private _onHover(params: HoverParams): Hover {
		console.debug(`_onHover`);
		return { contents: '' };
	}

	private _onInitialized(): void {
		const connection = this._workspace.connection;
		// Register for client configuration notification changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);

		// This is how we can listen for changes to workspace folders.
		if (hasConfigurationCapability(this._configuration)) {
			connection.workspace.onDidChangeWorkspaceFolders(e =>
				this._onDidChangeWorkspaceFolders(e)
			);
			connection.client.register(DidChangeConfigurationNotification.type, undefined);
		}
	}

	/** Documents event handlers */

	/**
	 * This event handler is called whenever a `TextDocuments<TextDocument>` is changed.
	 * @param doc The document that changed.
	 */
	async _onDidOpenTextDocumentAsync(params: DidOpenTextDocumentParams) {
		await this._handleChangeOrOpenAsync(TextDocument.create(
			params.textDocument.uri,
			params.textDocument.languageId,
			params.textDocument.version,
			params.textDocument.text
		));
	}

	async onDidChangeContentAsync(document: TextDocument) {
		await this._handleChangeOrOpenAsync(document);
	}

	protected async _handleChangeOrOpenAsync(document: TextDocument) {
		const doc = BaseProjectDocument.create(this._workspace, document);
		this._parsedDocuments.set(document.uri, doc);
		this._activeDocument = doc;
		await this._workspace.parseActiveDocument(this._activeDocument);
	}
}
