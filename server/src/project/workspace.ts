// Core
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
	CancellationToken,
	CancellationTokenSource,
	CodeAction,
	CodeActionParams,
	Command,
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
	RenameParams,
	SemanticTokensRangeParams,
	SymbolInformation,
	TextDocuments,
	TextEdit,
	WorkspaceEdit,
	WorkspaceFolder,
	WorkspaceFoldersChangeEvent,
	_Connection
} from 'vscode-languageserver';

import { BaseProjectDocument } from './document';
import { hasWorkspaceConfigurationCapability } from '../capabilities/workspaceFolder';
import { sleep, walk } from '../utils/helpers';
import { ParseCancellationException } from 'antlr4ng';
import { getFormattingEdits } from './formatter';
import { VbaFmtListener } from './parser/vbaListener';
import { returnDefaultOnCancelClientRequest } from '../utils/wrappers';
import { inject, injectable } from 'tsyringe';
import { Logger, ILanguageServer, IWorkspace } from '../injection/interface';
import { Services } from '../injection/services';
import { ItemType, ScopeItemCapability } from '../capabilities/capabilities';
import { SyntaxParser } from './parser/vbaParser';

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
	private parseCancellationTokenSource?: CancellationTokenSource;

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

	constructor(
		@inject("_Connection") public readonly connection: _Connection,
		@inject("ILanguageServer") private server: ILanguageServer) {

		this.logger = Services.logger;
		this.events = new WorkspaceEvents(this.textDocuments, this.projectDocuments);
		this._hasConfigurationCapability = hasWorkspaceConfigurationCapability(this.server);

		// Configure scopes
		const languageScope = new ScopeItemCapability(undefined, ItemType.VBA);
		const applicationScope = new ScopeItemCapability(undefined, ItemType.APPLICATION, undefined, languageScope);
		const projectScope = new ScopeItemCapability(undefined, ItemType.PROJECT, undefined, applicationScope);
		Services.registerProjectScope(projectScope);
	}

	// Initially parse everything in the folder.
	// ToDo: Handle removal of a workspace folder.
	async addWorkspaceFolder(params: WorkspaceFolder): Promise<void> {
		this.logger.info(`Adding workspace: ${params.name}`);
		const workspaceFiles = walk(params.uri, /\.(cls|bas|frm)$/i);

		// No need to continue if we have no files.
		if (workspaceFiles.size === 0) {
			return;
		}

		// Set up parser and dummy token because we won't cancel this.
		const parser = new SyntaxParser(this.logger);
		const token = new CancellationTokenSource().token;

		// Handle each file in the workspace.
		for (const [uri, file] of workspaceFiles) {
			// Don't parse files that we're already tracking.
			if (this.projectDocuments.has(uri)) {
				this.logger.debug(`Skipping file: ${uri}`, 1);
				continue;
			}

			try {
				// Read and parse the project document.
				this.logger.debug(`Reading file: ${uri}`, 1);
				const textDocument = TextDocument.create(`${uri}`, 'vba', 1, file);
				const projectDocument = BaseProjectDocument.create(textDocument);
				this.projectDocuments.set(uri, projectDocument);
				await parser.parse(token, projectDocument);
				this.logger.info(`Parsed ${projectDocument.name}`, 1);
			} catch (e) {
				// Log errors and anything else without failing.
				this.logger.error(`Failed to parse ${uri}`, 0, e);
			}
		}

		// Rebuild scopes from Project level.
		Services.projectScope.build();
		// Services.projectScope.printToDebug();
	}

	async parseDocument(document: BaseProjectDocument) {
		// this.activateDocument(document);
		this.parseCancellationTokenSource?.cancel();
		this.parseCancellationTokenSource = new CancellationTokenSource();

		// Exceptions thrown by the parser should be ignored.
		try {
			await document.parse(this.parseCancellationTokenSource.token);
			this.logger.info(`Parsed ${document.name}`);
			this.connection.sendDiagnostics(document.languageServerDiagnostics());
		} catch (e) {
			if (e instanceof ParseCancellationException) {
				// Swallow cancellation exceptions. They're good. We like these.
			} else {
				this.logger.debug('Parser did not cancel or complete.', 0, e);
			}
		}

		this.parseCancellationTokenSource = undefined;
	}

	async formatParseDocument(document: TextDocument, token: CancellationToken): Promise<VbaFmtListener | undefined> {
		// Exceptions thrown by the parser should be ignored.
		let result: VbaFmtListener | undefined;
		try {
			const projectDocument = this.projectDocuments.get(document.uri);
			result = await projectDocument?.formatParse(token);
			this.logger.info(`Formatted ${document.uri}`);
		}
		catch (e) {
			if (e instanceof ParseCancellationException) {
				this.logger.debug('Parse cancelled successfully.');
			} else {
				this.logger.error(`Parse failed.`, 0, e);
			}
		}

		this.parseCancellationTokenSource = undefined;
		return result;
	}

	openDocument(document: TextDocument): void {
		const projectDocument = this.projectDocuments.get(document.uri);
		if (document.version === projectDocument?.version) {
			projectDocument.open();
			this.parseDocument(projectDocument);
			this.connection.sendDiagnostics(projectDocument.languageServerDiagnostics());
		}
	}

	closeDocument(document: TextDocument): void {
		const projectDocument = this.projectDocuments.get(document.uri);
		if (!projectDocument) {
			Services.logger.warn(`Failed to get document to close: ${document.uri}`);
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
	};

	private getConfiguration = async () => {
		// Logging here will cause a cyclical crash of the server.
		return await this.connection.workspace.getConfiguration('vbaLanguageServer');
	};
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

	private async getParsedProjectDocument(uri: string, version: number, token: CancellationToken): Promise<BaseProjectDocument | undefined> {
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
			(p: DocumentSymbolParams, t) => this.onDocumentSymbolAsync(p, t), [], 'Document Symbols');

		const cancellableOnFoldingRanges = returnDefaultOnCancelClientRequest(
			(p: FoldingRangeParams, t) => this.onFoldingRangesAsync(p, t), [], 'Folding Range');

		connection.onCodeAction(async (params, token) => this.onCodeActionRequest(params, token));
		connection.onCompletion(params => this.onCompletion(params));
		connection.onCompletionResolve(item => this.onCompletionResolve(item));
		connection.onDidChangeConfiguration(() => Services.workspace.clearDocumentsConfiguration());
		connection.onDidChangeWatchedFiles(params => this.onDidChangeWatchedFiles(params));
		connection.onDidCloseTextDocument(params => { Services.logger.debug('[event] onDidCloseTextDocument'); Services.logger.debug(JSON.stringify(params), 1); });
		connection.onDocumentFormatting(async (params, token) => await this.onDocumentFormatting(params, token));
		connection.onDocumentSymbol(async (params, token) => await cancellableOnDocSymbol(params, token));
		connection.onHover(params => this.onHover(params));
		connection.onInitialized(() => this.onInitialized());
		connection.onRenameRequest((params, token) => this.onRenameRequest(params, token));

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
		Services.logger.debug('[event] onDocumentSymbol');
		const document = await this.getParsedProjectDocument(params.textDocument.uri, 0, token);
		return document?.languageServerSymbolInformation() ?? [];
	}

	private async onFoldingRangesAsync(params: FoldingRangeParams, token: CancellationToken): Promise<FoldingRange[]> {
		const logger = Services.logger;
		logger.debug('[Event] onFoldingRanges');
		let document: BaseProjectDocument | undefined;
		try {
			document = await this.getParsedProjectDocument(params.textDocument.uri, 0, token);
		} catch (error) {
			// Swallow parser cancellations and rethrow anything else.
			if (error instanceof ParseCancellationException) {
				throw error;
			}
		}
		const result = document?.languageServerFoldingRanges();
		for (const foldingRange of result ?? []) {
			logger.debug(`${JSON.stringify(foldingRange.range)} '${foldingRange.openWord}..${foldingRange.closeWord}'`, 1);
		}
		return result?.map(x => x.range) ?? [];
	}

	private onHover(params: HoverParams): Hover {
		const logger = Services.logger;
		logger.debug('[event] onHover');
		logger.debug(JSON.stringify(params), 1);
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

		// Read workspace folders if we have them.
		Services.server.configuration?.params
			.workspaceFolders?.forEach(folder => setImmediate(() =>
				Services.workspace.addWorkspaceFolder(folder)));
	}

	private async onDocumentFormatting(params: DocumentFormattingParams, token: CancellationToken): Promise<TextEdit[]> {
		const logger = Services.logger;
		logger.debug('[event] onDocumentFormatting');
		logger.debug(JSON.stringify(params), 1);
		const doc = this.documents.get(params.textDocument.uri);
		if (!doc) return [];
		try {
			const parseResult = await Services.workspace.formatParseDocument(doc, token);
			return parseResult ? getFormattingEdits(doc, parseResult) : [];
		} catch {
			logger.debug('caught workspace');
			return [];
		}

	}

	private async onCodeActionRequest(params: CodeActionParams, token: CancellationToken): Promise<(Command | CodeAction)[] | null | undefined> {
		const logger = Services.logger;
		logger.debug(`[event] onCodeAction: ${JSON.stringify(params)}`);

		// For now, if we have no diagnostics then don't return any actions.
		if (params.context.diagnostics.length === 0) {
			return [];
		}

		if (token.isCancellationRequested) {
			logger.debug(`[cbs] onCodeAction`);
			return;
		}

		try {
			const uri = params.textDocument.uri;
			const result: (Command | CodeAction)[] = [];
			const codeActionRegistry = Services.codeActionsRegistry;
			params.context.diagnostics.forEach(d => {
				const action = codeActionRegistry.getDiagnosticAction(d, uri);
				if (action) {
					result.push(action);
				}
			});
			return result;
		} catch (e) {
			// If cancelled or something went wrong, just return.
			if (e instanceof Error) {
				logger.stack(e);
			}
			return;
		}
	}

	private async onRenameRequest(params: RenameParams, token: CancellationToken): Promise<WorkspaceEdit | undefined | null> {
		Services.logger.debug(`[event] onRenameRequest: ${JSON.stringify(params)}`);
		if (token.isCancellationRequested) {
			Services.logger.debug(`onRenameRequest cancelled before start.`);
			return;
		}

		const renameItems = Services.projectScope.getRenameItems(params.textDocument.uri, params.position);
		const workspaceEdit: { changes: { [uri: string]: TextEdit[] }; } = { changes: {} };

		for (const renameItem of renameItems) {
			const uri = renameItem.element?.context.document.uri;
			if (!uri) {
				Services.logger.warn('Scope item has no element to rename');
				continue;
			}

			const range = renameItem.element.identifierCapability?.range;
			if (!range) {
				Services.logger.warn('Scope item has no identifier to rename');
				continue;
			}

			workspaceEdit.changes[uri] ??= [];
			workspaceEdit.changes[uri].push(TextEdit.replace(range, params.newName));
		}

		Services.logger.debug(`resolved onRenameRequest: returning\n${JSON.stringify(workspaceEdit)}`);

		// Allow a cancellation to be processed if we have one.
		await new Promise(resolve => setTimeout(resolve, 0));
		if (token.isCancellationRequested) {
			Services.logger.debug(`onRenameRequest cancelled during run.`);
			return;
		}
		return workspaceEdit;
	}

	/** Documents event handlers */

	/**
	 * Flags a document as 'open' if it is being tracked.
	 * @param document The document being opened.
	 */
	onDidOpen(document: TextDocument) {
		const logger = Services.logger;
		logger.debug('[event] onDidOpen');
		logger.debug(`uri: ${document.uri.toFilePath()}`, 1);
		logger.debug(`languageId: ${document.languageId}`, 1);
		logger.debug(`version: ${document.version}`, 1);
		const projectDocument = this.projectDocuments.get(document.uri.toFilePath());
		if (projectDocument) {
			Services.workspace.openDocument(document);
		}
	}

	/**
	 * Handles a document change event by parsing it.
	 * @param document The document that was changed.
	 */
	onDidChangeContent(document: TextDocument): void {
		const logger = Services.logger;
		logger.debug('[event] onDidChangeContent');
		logger.debug(`uri: ${document.uri.toFilePath()}`, 1);
		logger.debug(`languageId: ${document.languageId}`, 1);
		logger.debug(`version: ${document.version}`, 1);

		// If the event is fired for the same version of the document, don't reparse.
		const docPath = document.uri.toFilePath();
		const existingDocument = this.projectDocuments.get(docPath);
		const existingVersion = existingDocument?.version ?? -1;
		logger.debug(`existing: ${existingVersion}`, 1);
		if (existingVersion >= document.version) {
			logger.debug('Document already parsed.');
			return;
		}

		// The document is new or a new version that we should parse.
		const projectDocument = BaseProjectDocument.create(document);
		this.projectDocuments.set(docPath, projectDocument);
		Services.projectScope.invalidate(docPath);
		Services.workspace.parseDocument(projectDocument);
	}

	/**
	 * Flags a document as 'closed' if it is being tracked.
	 * @param document The document being closed.
	 */
	onDidClose(document: TextDocument) {
		const logger = Services.logger;
		logger.debug('[event] onDidClose');
		logger.debug(`uri: ${document.uri}`, 1);
		logger.debug(`languageId: ${document.languageId}`, 1);
		logger.debug(`version: ${document.version}`, 1);
		const projectDocument = this.projectDocuments.get(document.uri);
		if (projectDocument) {
			Services.workspace.closeDocument(document);
		}
	}
}
