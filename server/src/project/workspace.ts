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
import { LspLogger } from '../utils/logger';
import { returnDefaultOnCancelClientRequest } from '../utils/wrappers';

export interface ExtensionConfiguration {
	maxDocumentLines: number;
	maxNumberOfProblems: number;
	doWarnOptionExplicitMissing: boolean;
	environment: {
		os: string;
		version: string;
	}
	logLevel: {
		outputChannel: string;
	}
}


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
	private _extensionConfiguration?: ExtensionConfiguration;

	readonly connection: _Connection;
	logger: LspLogger;
	
	get hasConfigurationCapability() {
		return this._hasConfigurationCapability;
	}
	
	get extensionConfiguration() {
		return (async () => {
			if (!this._extensionConfiguration && this.hasConfigurationCapability) {
				this._extensionConfiguration = await this.getConfiguration();
			}
			return this._extensionConfiguration;
		})();
	}

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
		this.logger = new LspLogger(this);
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

		if (!this.activeDocument) {
			this.logger.error('No active document.');
			return;
		}
		
		// Exceptions thrown by the parser should be ignored.
		try {
			await this.activeDocument.parseAsync(this.parseCancellationTokenSource.token);
			this.logger.info(`Parsed ${this.activeDocument.name}`);
		} catch (e) {
			// Swallow cancellation exceptions. They're good. We like these.
			if (e instanceof ParseCancellationException) { }
			else if (e instanceof Error) { this.logger.stack(e); }
			else { this.logger.error('Something went wrong.')}
		}

		this.parseCancellationTokenSource = undefined;
	}

	async formatParseDocument(document: TextDocument): Promise<VbaFmtListener | undefined> {
		this.parseCancellationTokenSource?.cancel();
		this.parseCancellationTokenSource = new CancellationTokenSource();

		// Exceptions thrown by the parser should be ignored.
		let result: VbaFmtListener | undefined;
		try {
			result = await this.activeDocument?.formatParseAsync(this.parseCancellationTokenSource.token);
			this.logger.info(`Formatted ${document.uri}`);
		}
		catch (e) {
			if (e instanceof ParseCancellationException) {
				this.logger.debug('Parse cancelled successfully.')
			} else if (e instanceof Error) {
				this.logger.stack(e);
			} else {
				this.logger.error(`Parse failed: ${e}`)
			}
		}

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
		this.logger.debug('[event] didChangeConfiguration');
		this._extensionConfiguration = undefined;

		// TODO: This will trigger configuration to be requested
		// immediately anyway so no point in it being lazy. May not
		// even be working as diagnostics will already have been resolved.
		this.connection.languages.diagnostics.refresh();
	}

	private getConfiguration = async () => {
		// Logging here will cause a cyclical crash of the server.
		return await this.connection.workspace.getConfiguration('vbaLanguageServer');
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
		const cancellableOnDocSymbol = returnDefaultOnCancelClientRequest(
			(p: DocumentSymbolParams, t) => this.onDocumentSymbolAsync(p, t), [], this.workspace.logger, 'Document Symbols');

		const cancellableOnDiagnostics = returnDefaultOnCancelClientRequest(
			(p: DocumentDiagnosticParams, t) => this.onDiagnosticAsync(p, t),
			{kind: DocumentDiagnosticReportKind.Full, items: []},
			this.workspace.logger,
			'Diagnostics');
		
		const cancellableOnFoldingRanges = returnDefaultOnCancelClientRequest(
			(p: FoldingRangeParams, t) => this.onFoldingRangesAsync(p, t), [], this.workspace.logger, 'Folding Range')

		connection.onInitialized(() => this.onInitialized());
		connection.onDidOpenTextDocument(params => this.onDidOpenTextDocumentAsync(params));
		connection.onCompletion(params => this.onCompletion(params));
		connection.onCompletionResolve(item => this.onCompletionResolve(item));
		connection.onDidChangeConfiguration(() => this.workspace.clearDocumentsConfiguration());
		connection.onDidChangeWatchedFiles(params => this.onDidChangeWatchedFiles(params));
		connection.onDocumentSymbol(async (params, token) => await cancellableOnDocSymbol(params, token));
		connection.onHover(params => this.onHover(params));
		connection.languages.diagnostics.on(async (params, token) => await cancellableOnDiagnostics(params, token));
		connection.onDocumentFormatting(params => this.onDocumentFormatting(params));
		connection.onDidCloseTextDocument(params => {this.workspace.logger.debug('[event] onDidCloseTextDocument'); this.workspace.logger.debug(JSON.stringify(params), 1);});

		if (hasConfigurationCapability(this.configuration)) {
			connection.onFoldingRanges(async (params, token) => await cancellableOnFoldingRanges(params, token));
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
					this.workspace.logger.error(`Unresolved request path: ${method}`);
			}
		});
	}

	private initialiseDocumentsEvents() {
		this.documents.onDidChangeContent(async (e) => await this.onDidChangeContentAsync(e.document));
	}

	/** Connection event handlers */

	private onCompletion(params: CompletionParams): never[] {
		this.workspace.logger.debug('[event] onCompletion');
		this.workspace.logger.debug(JSON.stringify(params), 1);
		return [];
	}

	private onCompletionResolve(item: CompletionItem): CompletionItem {
		this.workspace.logger.debug('[event] onCompletionResolve');
		this.workspace.logger.debug(JSON.stringify(item), 1);
		return item;
	}

	private onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams) {
		this.workspace.logger.debug('[event] onDidChangeWatchedFiles');
		this.workspace.logger.debug(JSON.stringify(params), 1);
		return;
	}

	// TODO: Should trigger a full workspace refresh.
	private onDidChangeWorkspaceFolders(e: WorkspaceFoldersChangeEvent) {
		this.workspace.logger.debug('[event] onDidChangeWorkspaceFolders');
		this.workspace.logger.debug(JSON.stringify(e), 1);
	}

	private async onDocumentSymbolAsync(params: DocumentSymbolParams, token: CancellationToken): Promise<SymbolInformation[]> {
		const document = await this.getParsedDocument(params.textDocument.uri, 0, token);
		return document?.languageServerSymbolInformation() ?? [];
	}

	private async onDiagnosticAsync(params: DocumentDiagnosticParams, token: CancellationToken): Promise<DocumentDiagnosticReport> {
		const document = await this.getParsedDocument(params.textDocument.uri, 0, token);
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
		this.workspace.logger.debug('[event] onHover');
		this.workspace.logger.debug(JSON.stringify(params), 1);
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
		this.workspace.logger.debug('[event] onDocumentFormatting');
		this.workspace.logger.debug(JSON.stringify(params), 1);
		const doc = this.documents.get(params.textDocument.uri);
		if (!doc) return [];
		const parseResult = await this.workspace.formatParseDocument(doc);

		return parseResult ? getFormattingEdits(doc, parseResult) : [];
	}

	/** Documents event handlers */

	/**
	 * This event handler is called whenever a `TextDocuments<TextDocument>` is changed.
	 * @param doc The document that changed.
	 */
	async onDidOpenTextDocumentAsync(params: DidOpenTextDocumentParams) {
		this.workspace.logger.debug('[event] onDidOpenTextDocumentAsync');
		this.workspace.logger.debug(`uri: ${params.textDocument.uri}`, 1);
		this.workspace.logger.debug(`languageId: ${params.textDocument.languageId}`, 1);
		this.workspace.logger.debug(`version: ${params.textDocument.version}`, 1);
		await this.handleChangeOrOpenAsync(TextDocument.create(
			params.textDocument.uri,
			params.textDocument.languageId,
			params.textDocument.version,
			params.textDocument.text
		));
	}

	async onDidChangeContentAsync(document: TextDocument) {
		this.workspace.logger.debug('[event] onDidChangeContentAsync');
		this.workspace.logger.debug(`uri: ${document.uri}`, 1);
		this.workspace.logger.debug(`languageId: ${document.languageId}`, 1);
		this.workspace.logger.debug(`version: ${document.version}`, 1);
		await this.handleChangeOrOpenAsync(document);
	}

	protected async handleChangeOrOpenAsync(document: TextDocument) {
		// If the event is fired for the same version of the document, don't reparse.
		const currentDocument = this.parsedDocuments.get(document.uri);
		if (!!currentDocument && currentDocument.textDocument.version >= document.version) {
			this.workspace.logger.debug('Document already parsed.');
			return;
		}

		const doc = BaseProjectDocument.create(this.workspace, document);
		this.parsedDocuments.set(document.uri, doc);
		this.activeDocument = doc;
		await this.workspace.parseActiveDocument(this.activeDocument);
	}
}
