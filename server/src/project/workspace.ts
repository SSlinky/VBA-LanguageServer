import { CancellationToken, CancellationTokenSource, CompletionItem, CompletionParams, DidChangeConfigurationNotification, DidChangeConfigurationParams, DidChangeWatchedFilesParams, DidOpenTextDocumentParams, DocumentSymbolParams, FoldingRange, FoldingRangeParams, Hover, HoverParams, PublishDiagnosticsParams, SemanticTokensParams, SemanticTokensRangeParams, SymbolInformation, TextDocuments, WorkspaceFoldersChangeEvent, _Connection } from 'vscode-languageserver';
import { BaseProjectDocument } from './document';
import { LanguageServerConfiguration } from '../server';
import { hasConfigurationCapability } from '../capabilities/workspaceFolder';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { sleep } from '../utils/helpers';


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

	private _activeDocument?: BaseProjectDocument;

	constructor(params: {connection: _Connection, workspace: Workspace, configuration: LanguageServerConfiguration}) {
		this._connection = params.connection;
		this._workspace = params.workspace;
		this._configuration = params.configuration;
		this._documents = new TextDocuments(TextDocument);
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
		while (document.Busy) {
			await sleep(5);
		}
		return document;
	}

	private initialiseConnectionEvents(connection: _Connection) {
		connection.onInitialized(() => this._onInitialized());
		connection.onDidOpenTextDocument(params => this._onDidOpenTextDocument(params));
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

	private _sendDiagnostics() {
		this._connection.sendDiagnostics(this._activeDocument?.languageServerDiagnostics() ?? {uri: "", diagnostics: []});
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
		const document = await this.activeParsedDocument(0, token);
		return document?.languageServerSymbolInformation() ?? [];
	}

	private async _onFoldingRanges(params: FoldingRangeParams, token: CancellationToken): Promise<FoldingRange[]> {
		// VSCode is an eager beaver and sends the folding range request before onDidChange or onDidOpen.
		await sleep(200);
		const document = await this.activeParsedDocument(0, token);
		const result = document?.languageServerFoldingRanges();
		return result ?? [];
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
	async _onDidOpenTextDocument(params: DidOpenTextDocumentParams) {
		await this._handleChangeOrOpenAsync(TextDocument.create(
			params.textDocument.uri,
			params.textDocument.languageId,
			params.textDocument.version,
			params.textDocument.text
		));
	}

	async onDidChangeContentAsync(document: TextDocument) {
		await this._handleChangeOrOpenAsync(document);
		// this._parseCancellationToken?.cancel();
		// this._parseCancellationToken?.dispose();
	}

	protected async _handleChangeOrOpenAsync(document: TextDocument) {
		this._activeDocument = BaseProjectDocument.create(this._workspace, document);
		this._parseCancellationToken = new CancellationTokenSource();
		await this._activeDocument.parseAsync(this._parseCancellationToken.token);
		this._sendDiagnostics();
		this._parseCancellationToken = undefined;
		this._workspace.activateDocument(this._activeDocument);
	}
}

