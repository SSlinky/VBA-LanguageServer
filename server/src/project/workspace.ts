import { CompletionItem, CompletionParams, DidChangeConfigurationNotification, DidChangeConfigurationParams, DidChangeWatchedFilesParams, DocumentSymbolParams, FoldingRange, FoldingRangeParams, Hover, HoverParams, SemanticTokensParams, SemanticTokensRangeParams, SymbolInformation, TextDocuments, WorkspaceFoldersChangeEvent, _Connection } from 'vscode-languageserver';
import { BaseProjectDocument, ProjectDocument } from './document';
import { LanguageServerConfiguration } from '../server';
import { hasConfigurationCapability } from '../capabilities/workspaceFolder';
import { TextDocument } from 'vscode-languageserver-textdocument';


/**
 * Organises project documents and runs actions
 * at a workspace level.
 */
export class Workspace {
	private _events: WorkspaceEvents;
	private _documents: ProjectDocument[] = [];
	private _activeDocument?: ProjectDocument;
	private _publicScopeDeclarations: Map<string, any> = new Map();
	
	readonly connection: _Connection;

	activateDocument(document: ProjectDocument) {
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
	private readonly _workspace: Workspace;
	private readonly _documents: TextDocuments<TextDocument>;
	private readonly _configuration: LanguageServerConfiguration;

	activeDocument?: ProjectDocument;

	constructor(params: {connection: _Connection, workspace: Workspace, configuration: LanguageServerConfiguration}) {
		this._workspace = params.workspace;
		this._configuration = params.configuration;
		this._documents = new TextDocuments(TextDocument);
		this.initialiseConnectionEvents(params.connection);
		this.initialiseDocumentsEvents();
		this._documents.listen(params.connection);
	}

	private initialiseConnectionEvents(connection: _Connection) {
		console.log('Initialising connection events...');
		connection.onInitialized(() => this.onInitialized());
		connection.onCompletion(params => this.onCompletion(params));
		connection.onCompletionResolve(item => this.onCompletionResolve(item));
		connection.onDidChangeConfiguration(params => this.onDidChangeConfiguration(params));
		connection.onDidChangeWatchedFiles(params => this.onDidChangeWatchedFiles(params));
		connection.onDocumentSymbol(async (params) => await this.onDocumentSymbolAsync(params));
		connection.onHover(params => this.onHover(params));

		if (hasConfigurationCapability(this._configuration)) {
			connection.onFoldingRanges((params) => this.onFoldingRanges(params));
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
		console.log('Initialising documents events...');
		this._documents.onDidChangeContent(async (e) => await this.onDidChangeContentAsync(e.document));
	}

	/** Connection event handlers */

	private onCompletion(params: CompletionParams): never[] {
		console.log(`onCompletion: ${params}`);
		return [];
	}

	private onCompletionResolve(item: CompletionItem): CompletionItem {
		console.log(`onCompletionResolve: ${item.label}`);
		return item;
	}

	private onDidChangeConfiguration(params: DidChangeConfigurationParams): void {
		console.log(`onDidChangeConfiguration: ${params}`);
	}

	private onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams) {
		console.log(`onDidChangeWatchedFiles: ${params}`);
	}

	// TODO: Should trigger a full workspace refresh.
	private onDidChangeWorkspaceFolders(e: WorkspaceFoldersChangeEvent) {
		console.log(`onDidChangeWorkspaceFolders: ${e}`);
		this._workspace.connection.console.log(`Workspace folder change event received.\n${e}`);
	}

	private async onDocumentSymbolAsync(params: DocumentSymbolParams): Promise<SymbolInformation[]> {
		return await this.activeDocument?.languageServerSymbolInformationAsync() ?? [];
	}

	private onFoldingRanges(params: FoldingRangeParams): FoldingRange[] {
		return this._workspace.activeDocument?.foldableElements ?? [];
	}

	private onHover(params: HoverParams): Hover {
		return { contents: '' };
	}

	private onInitialized(): void {
		const connection = this._workspace.connection;
		// Register for client configuration notification changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);

		// This is how we can listen for changes to workspace folders.
		if (hasConfigurationCapability(this._configuration)) {
			connection.workspace.onDidChangeWorkspaceFolders(e =>
				this.onDidChangeWorkspaceFolders(e)
			);
		}
	}

	/** Documents event handlers */

	/**
	 * This event handler is called whenever a `TextDocuments<TextDocument>` is changed.
	 * @param doc The document that changed.
	 */
	async onDidChangeContentAsync(doc: TextDocument) {
		this.activeDocument = BaseProjectDocument.create(this._workspace, doc);
		await this.activeDocument.parseAsync();
		this._workspace.activateDocument(this.activeDocument);
	}

}