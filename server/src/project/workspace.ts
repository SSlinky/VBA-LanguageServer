// Core
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
	CancellationToken,
	CancellationTokenSource,
	CompletionItem,
	CompletionParams,
	DidChangeConfigurationNotification,
	DidChangeWatchedFilesParams,
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
import { hasWorkspaceConfigurationCapability } from '../capabilities/workspaceFolder';
import { sleep } from '../utils/helpers';
import { NamespaceManager } from './scope';
import { ParseCancellationException } from 'antlr4ng';
import { getFormattingEdits } from './formatter';
import { VbaFmtListener } from './parser/vbaListener';
import { returnDefaultOnCancelClientRequest } from '../utils/wrappers';
import { inject, injectable } from 'tsyringe';
import { Logger, ILanguageServer, IWorkspace } from '../injection/interface';
import { Services } from '../injection/services';

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
@injectable()
export class Workspace implements IWorkspace {
	private events?: WorkspaceEvents;
	private nsManager: NamespaceManager = new NamespaceManager();
	private documents: BaseProjectDocument[] = [];
	private parseCancellationTokenSource?: CancellationTokenSource;

	private _activeDocument?: BaseProjectDocument;
	private readonly _hasConfigurationCapability: boolean;
	private _extensionConfiguration?: ExtensionConfiguration;

	private readonly textDocuments: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
	private readonly projectDocuments: Map<string, BaseProjectDocument> = new Map();

	// readonly connection: _Connection;
	logger: Logger;
	
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

	constructor(
		@inject("_Connection") public readonly connection: _Connection,
		@inject("ILanguageServer") private server: ILanguageServer) {
			
		this.logger = Services.logger;
		this.events = new WorkspaceEvents(this.textDocuments, this.projectDocuments);
		this._hasConfigurationCapability = hasWorkspaceConfigurationCapability(this.server);
	}

	activateDocument(document?: BaseProjectDocument) {
		if (document) {
			this._activeDocument = document;
		}
	}

	async parseDocument(document?: BaseProjectDocument) {
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
			this.connection.sendDiagnostics(this.activeDocument.languageServerDiagnostics());
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

	openDocument(document: TextDocument): void {
		const projectDocument = this.projectDocuments.get(document.uri);
		if (document.version === projectDocument?.version) {
			projectDocument.open();
			this.connection.sendDiagnostics(projectDocument.languageServerDiagnostics());
		}
	}

	closeDocument(document: TextDocument): void {
		const projectDocument = this.projectDocuments.get(document.uri);
		if (!projectDocument) {
			Services.logger.warn(`Failed to get document to close: ${document.uri}`)
			return;
		}

		projectDocument.close();
		this.connection.sendDiagnostics(projectDocument.languageServerDiagnostics());
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
	private activeDocument?: BaseProjectDocument;

	constructor(
		private readonly documents: TextDocuments<TextDocument>,
		private readonly projectDocuments: Map<string, BaseProjectDocument>
	) {
		const connection = Services.connection;
		this.initialiseConnectionEvents(connection);
		this.initialiseDocumentsEvents();
		this.documents.listen(connection);
	}

	private async getParsedProjectDocument(uri: string, version: number, token: CancellationToken): Promise<BaseProjectDocument|undefined> {
		// Handle token cancellation.
		if (token.isCancellationRequested) return undefined;

		let cancelled = false;
		token.onCancellationRequested(() => cancelled = true);

		let document: BaseProjectDocument | undefined;
		document = this.projectDocuments.get(uri);

		// Ensure we have the appropriately versioned document.
		while (!document || document.textDocument.version < version) {
			if (cancelled) return undefined;
			await sleep(5);
			document = this.projectDocuments.get(uri);
		}

		// Return nothing if the document version is newer than requested.
		if (version > 0 && document.textDocument.version != version) {
			return;
		}

		// Ensure the document is parsed.
		while (document.isBusy) {
			if (cancelled) return undefined;
			await sleep(5);
		}

		return document;
	}

	private initialiseConnectionEvents(connection: _Connection) {
		const cancellableOnDocSymbol = returnDefaultOnCancelClientRequest(
			(p: DocumentSymbolParams, t) => this.onDocumentSymbolAsync(p, t), [], Services.logger, 'Document Symbols');
		
		const cancellableOnFoldingRanges = returnDefaultOnCancelClientRequest(
			(p: FoldingRangeParams, t) => this.onFoldingRangesAsync(p, t), [], Services.logger, 'Folding Range');

		connection.onInitialized(() => this.onInitialized());
		connection.onCompletion(params => this.onCompletion(params));
		connection.onCompletionResolve(item => this.onCompletionResolve(item));
		connection.onDidChangeConfiguration(() => Services.workspace.clearDocumentsConfiguration());
		connection.onDidChangeWatchedFiles(params => this.onDidChangeWatchedFiles(params));
		connection.onDocumentSymbol(async (params, token) => await cancellableOnDocSymbol(params, token));
		connection.onHover(params => this.onHover(params));
		connection.onDocumentFormatting(async (params, token) => await this.onDocumentFormatting(params, token));
		connection.onDidCloseTextDocument(params => {Services.logger.debug('[event] onDidCloseTextDocument'); Services.logger.debug(JSON.stringify(params), 1);});

		if (hasWorkspaceConfigurationCapability(Services.server)) {
			connection.onFoldingRanges(async (params, token) => await cancellableOnFoldingRanges(params, token));
		}

		connection.onRequest((method: string, params: object | object[] | any) => {
			switch (method) {
				case 'textDocument/semanticTokens/full': {
					const uri: string = params.textDocument.uri;
					return this.activeDocument?.languageServerSemanticTokens();
				}
				case 'textDocument/semanticTokens/range': {
					const rangeParams = params as SemanticTokensRangeParams;
					return this.activeDocument?.languageServerSemanticTokens(rangeParams.range);
				}
				default:
					Services.logger.error(`Unresolved request path: ${method}`);
			}
		});
	}

	private initialiseDocumentsEvents() {
		// These are notifications so should not be async.
		this.documents.onDidOpen((e) => this.onDidOpen(e.document));
		this.documents.onDidClose((e) => this.onDidClose(e.document));
		this.documents.onDidChangeContent((e) => this.onDidChangeContent(e.document));
	}

	/** Connection event handlers */

	private onCompletion(params: CompletionParams): never[] {
		Services.logger.debug('[event] onCompletion');
		Services.logger.debug(JSON.stringify(params), 1);
		return [];
	}

	private onCompletionResolve(item: CompletionItem): CompletionItem {
		Services.logger.debug('[event] onCompletionResolve');
		Services.logger.debug(JSON.stringify(item), 1);
		return item;
	}

	private onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams) {
		Services.logger.debug('[event] onDidChangeWatchedFiles');
		Services.logger.debug(JSON.stringify(params), 1);
		return;
	}

	// TODO: Should trigger a full workspace refresh.
	private onDidChangeWorkspaceFolders(e: WorkspaceFoldersChangeEvent) {
		Services.logger.debug('[event] onDidChangeWorkspaceFolders');
		Services.logger.debug(JSON.stringify(e), 1);
	}

	private async onDocumentSymbolAsync(params: DocumentSymbolParams, token: CancellationToken): Promise<SymbolInformation[]> {
		const document = await this.getParsedProjectDocument(params.textDocument.uri, 0, token);
		return document?.languageServerSymbolInformation() ?? [];
	}

	private async onFoldingRangesAsync(params: FoldingRangeParams, token: CancellationToken): Promise<FoldingRange[]> {
		let document: BaseProjectDocument | undefined;
		try {
			document = await this.getParsedProjectDocument(params.textDocument.uri, 0, token);
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
		Services.logger.debug('[event] onHover');
		Services.logger.debug(JSON.stringify(params), 1);
		return { contents: '' };
	}

	private onInitialized(): void {
		const connection = Services.connection;
		// Register for client configuration notification changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);

		// This is how we can listen for changes to workspace folders.
		if (hasWorkspaceConfigurationCapability(Services.server)) {
			connection.workspace.onDidChangeWorkspaceFolders(e =>
				this.onDidChangeWorkspaceFolders(e)
			);
			connection.client.register(DidChangeConfigurationNotification.type, undefined);
		}
	}

	private async onDocumentFormatting(params: DocumentFormattingParams, token: CancellationToken): Promise<TextEdit[]> {
		Services.logger.debug('[event] onDocumentFormatting');
		Services.logger.debug(JSON.stringify(params), 1);
		const doc = this.documents.get(params.textDocument.uri);
		if (!doc) return [];
		try {
			const parseResult = await Services.workspace.formatParseDocument(doc, token);
			return parseResult ? getFormattingEdits(doc, parseResult) : [];
		} catch {
			Services.logger.debug('caught workspace');
			return [];
		}

	}

	/** Documents event handlers */

	/**
	 * Flags a document as 'open' if it is being tracked.
	 * @param document The document being opened.
	 */
	onDidOpen(document: TextDocument) {
		Services.logger.debug('[event] onDidOpen');
		Services.logger.debug(`uri: ${document.uri}`, 1);
		Services.logger.debug(`languageId: ${document.languageId}`, 1);
		Services.logger.debug(`version: ${document.version}`, 1);
		const projectDocument = this.projectDocuments.get(document.uri);
		if (projectDocument) {
			Services.workspace.openDocument(document);
		}
	}

	/**
	 * Handles a document change event by parsing it.
	 * @param document The document that was changed.
	 */
	onDidChangeContent(document: TextDocument): void {
		Services.logger.debug('[event] onDidChangeContentAsync');
		Services.logger.debug(`uri: ${document.uri}`, 1);
		Services.logger.debug(`languageId: ${document.languageId}`, 1);
		Services.logger.debug(`version: ${document.version}`, 1);

		// If the event is fired for the same version of the document, don't reparse.
		const existingDocument = this.projectDocuments.get(document.uri);
		if ((existingDocument?.version ?? -1) >= document.version) {
			Services.logger.debug('Document already parsed.');
			return;
		}

		// The document is new or a new version that we should parse.
		const projectDocument = BaseProjectDocument.create(document);
		this.projectDocuments.set(document.uri, projectDocument);
		Services.workspace.parseDocument(projectDocument);
	}

	/**
	 * Flags a document as 'closed' if it is being tracked.
	 * @param document The document being closed.
	 */
	onDidClose(document: TextDocument) {
		Services.logger.debug('[event] onDidClose');
		Services.logger.debug(`uri: ${document.uri}`, 1);
		Services.logger.debug(`languageId: ${document.languageId}`, 1);
		Services.logger.debug(`version: ${document.version}`, 1);
		const projectDocument = this.projectDocuments.get(document.uri);
		if (projectDocument) {
			Services.workspace.closeDocument(document);
		}
	}
}
