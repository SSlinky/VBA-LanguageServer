import { CancellationToken, CancellationTokenSource, CompletionItem, CompletionParams, DidChangeConfigurationNotification, DidChangeConfigurationParams, DidChangeWatchedFilesParams, DocumentSymbolParams, FoldingRange, FoldingRangeParams, Hover, HoverParams, PublishDiagnosticsParams, SemanticTokensParams, SemanticTokensRangeParams, SymbolInformation, TextDocuments, WorkspaceFoldersChangeEvent, _Connection } from 'vscode-languageserver';
import { BaseProjectDocument } from './document';
import { LanguageServerConfiguration } from '../server';
import { hasConfigurationCapability } from '../capabilities/workspaceFolder';
import { TextDocument } from 'vscode-languageserver-textdocument';


/**
 * Organises project documents and runs actions
 * at a workspace level.
 */
export class Workspace {
	private _events: WorkspaceEvents;
	private _documents: BaseProjectDocument[] = [];
	private _activeDocument?: BaseProjectDocument;
	private _publicScopeDeclarations: Map<string, any> = new Map();
	
	readonly connection: _Connection;

	activateDocument(document: BaseProjectDocument) {
		this._activeDocument = document;
	}

	get activeDocument() {
		return this._activeDocument;
	}

	// constructor(connection: _Connection, capabilities: LanguageServerCapabilities) {
	constructor(params: {connection: _Connection, capabilities: LanguageServerConfiguration}) {
		this.connection = params.connection;
		this._events = new WorkspaceEvents({
			workspace: this,
			connection: params.connection,
			configuration: params.capabilities,
		});
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

}

class WorkspaceEvents {
	private readonly _connection: _Connection;
	private readonly _workspace: Workspace;
	private readonly _documents: TextDocuments<TextDocument>;
	private readonly _configuration: LanguageServerConfiguration;
	private _parseCancellationToken?: CancellationTokenSource;

	activeDocument?: BaseProjectDocument;

	constructor(params: {connection: _Connection, workspace: Workspace, configuration: LanguageServerConfiguration}) {
		this._connection = params.connection;
		this._workspace = params.workspace;
		this._configuration = params.configuration;
		this._documents = new TextDocuments(TextDocument);
		this.initialiseConnectionEvents(params.connection);
		this._initialiseDocumentsEvents();
		this._documents.listen(params.connection);
	}

	private initialiseConnectionEvents(connection: _Connection) {
		connection.onInitialized(() => this._onInitialized());
		connection.onCompletion(params => this._onCompletion(params));
		connection.onCompletionResolve(item => this._onCompletionResolve(item));
		connection.onDidChangeConfiguration(params => this._onDidChangeConfiguration(params));
		connection.onDidChangeWatchedFiles(params => this._onDidChangeWatchedFiles(params));
		connection.onDocumentSymbol(async (params, token) => await this._onDocumentSymbolAsync(params, token));
		connection.onHover(params => this._onHover(params));

		if (hasConfigurationCapability(this._configuration)) {
			connection.onFoldingRanges(async (params, token) => this._onFoldingRanges(params, token));
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

	private _sendDiagnostics() {
		this._connection.sendDiagnostics(this.activeDocument?.getDiagnostics() ?? {uri: "", diagnostics: []});
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

	private _onDidChangeConfiguration(params: DidChangeConfigurationParams): void {
		console.log(`onDidChangeConfiguration: ${params.settings}`);
	}

	private _onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams) {
		console.log(`onDidChangeWatchedFiles: ${params}`);
	}

	// TODO: Should trigger a full workspace refresh.
	private _onDidChangeWorkspaceFolders(e: WorkspaceFoldersChangeEvent) {
		this._workspace.connection.console.log(`Workspace folder change event received.\n${e}`);
	}

	private async _onDocumentSymbolAsync(params: DocumentSymbolParams, token: CancellationToken): Promise<SymbolInformation[]> {
		return await this.activeDocument?.languageServerSymbolInformationAsync(token) ?? [];
	}

	private async _onFoldingRanges(params: FoldingRangeParams, token: CancellationToken): Promise<FoldingRange[]> {
		return await this._workspace.activeDocument?.getFoldingRanges(token) ?? [];
	}

	private _onHover(params: HoverParams): Hover {
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
		}
	}

	/** Documents event handlers */

	/**
	 * This event handler is called whenever a `TextDocuments<TextDocument>` is changed.
	 * @param doc The document that changed.
	 */
	async onDidChangeContentAsync(doc: TextDocument) {
		// this._parseCancellationToken?.cancel();
		// this._parseCancellationToken?.dispose();

		this.activeDocument = BaseProjectDocument.create(this._workspace, doc);
		this._parseCancellationToken = new CancellationTokenSource();
		await this.activeDocument.parseAsync(this._parseCancellationToken.token);
		this._sendDiagnostics();
		this._parseCancellationToken = undefined;
		this._workspace.activateDocument(this.activeDocument);
	}
}
